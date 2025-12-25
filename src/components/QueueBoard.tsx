'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { normalizeToEnglish } from '@/lib/textUtils';
import { debounce } from '@/lib/debounce';
import Pusher from 'pusher-js';

interface QueueEntry {
    id: number;
    rowIndex: number;
    side: string;
    position: string;
    text: string;
    checked: boolean;
    updatedAt: string;
}

interface HistoryLog {
    id: number;
    rowIndex: number;
    side: string;
    position: string;
    action: string;
    oldValue: string | null;
    newValue: string | null;
    timestamp: string;
}

export default function QueueBoard() {
    const [entries, setEntries] = useState<QueueEntry[]>([]);
    const [history, setHistory] = useState<HistoryLog[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
    const pusherRef = useRef<Pusher | null>(null);
    // Per-entry tracking for race condition prevention
    const pendingOpsRef = useRef<Set<number>>(new Set()); // Entry IDs with pending API calls
    const lockedEntriesRef = useRef<Map<number, number>>(new Map()); // Entry ID -> lock timestamp
    const lockedSidesRef = useRef<Map<string, number>>(new Map()); // Side -> lock timestamp (for checkbox)

    // Fetch entries (used for initial load only)
    const fetchEntries = async () => {
        try {
            const response = await fetch('/api/queue');
            const data = await response.json();

            // Handle rate limiting
            if (response.status === 429) {
                console.warn('Rate limited:', data.error);
                const retryAfter = response.headers.get('Retry-After');
                if (retryAfter) {
                    setError(`Rate limit exceeded. Retry in ${retryAfter}s`);
                    setTimeout(() => setError(null), parseInt(retryAfter) * 1000);
                }
                return;
            }

            // Check if API returned an error
            if (!response.ok || data.error) {
                setError(data.details || data.error || 'Failed to fetch data');
                setEntries([]);
                setLoading(false);
                return;
            }

            // Ensure data is an array before setting
            if (Array.isArray(data)) {
                setEntries(data);
                setError(null);
            } else {
                console.error('API returned non-array data:', data);
                setEntries([]);
                setError('Invalid data format received from server');
            }
            setLoading(false);
        } catch (error: any) {
            console.error('Error fetching entries:', error);
            setError('Cannot connect to server. Please check your internet connection.');
            setEntries([]);
            setLoading(false);
        }
    };

    // Fetch history (no changes needed here)
    const fetchHistory = async () => {
        try {
            const response = await fetch('/api/history');
            const data = await response.json();

            // Handle rate limiting
            if (response.status === 429) {
                console.warn('Rate limited on history:', data.error);
                return;
            }

            // Ensure data is an array before setting
            if (Array.isArray(data)) {
                setHistory(data);
            } else {
                console.error('API returned non-array data:', data);
                setHistory([]);
            }
        } catch (error: any) {
            console.error('Error fetching history:', error);
            setHistory([]);
        }
    };

    // Initialize data and Pusher connection
    useEffect(() => {
        const initializeData = async () => {
            try {
                // Try to fetch existing data
                const response = await fetch('/api/queue');
                const data = await response.json();

                // If no data or not an array, initialize
                if (!Array.isArray(data) || data.length === 0) {
                    await fetch('/api/queue', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'initialize' })
                    });
                }

                fetchEntries();
                fetchHistory();
            } catch (error) {
                console.error('Error initializing data:', error);
                setEntries([]);
                setLoading(false);
            }
        };

        initializeData();

        // Initialize Pusher (optional - app works without it)
        const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
        const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

        if (!pusherKey || !pusherCluster) {
            console.warn('⚠️ Pusher credentials not found. Real-time sync disabled.');
            console.warn('To enable real-time sync, set NEXT_PUBLIC_PUSHER_KEY and NEXT_PUBLIC_PUSHER_CLUSTER');
            console.warn('See PUSHER-SETUP.md for instructions');
            setConnectionState('disconnected');
            // App continues to work, just without real-time sync
            return;
        }

        // Create Pusher instance
        try {
            pusherRef.current = new Pusher(pusherKey, {
                cluster: pusherCluster,
                forceTLS: true,
            });
        } catch (error) {
            console.error('Failed to initialize Pusher:', error);
            setConnectionState('disconnected');
            return;
        }

        // Connection state handlers
        pusherRef.current.connection.bind('connecting', () => {
            console.log('Pusher connecting...');
            setConnectionState('connecting');
        });

        pusherRef.current.connection.bind('connected', () => {
            console.log('Pusher connected!');
            setConnectionState('connected');
        });

        pusherRef.current.connection.bind('disconnected', () => {
            console.log('Pusher disconnected');
            setConnectionState('disconnected');
        });

        pusherRef.current.connection.bind('error', (err: any) => {
            console.error('Pusher connection error:', err);
            setConnectionState('disconnected');
        });

        // Subscribe to queue channel
        const channel = pusherRef.current.subscribe('queue-channel');

        // Listen for entry updates
        channel.bind('entry-updated', (data: { entry: QueueEntry }) => {
            const entryId = data.entry.id;
            const entrySide = data.entry.side;
            const now = Date.now();

            // Skip if this entry has pending API operations
            if (pendingOpsRef.current.has(entryId)) {
                console.log('[Pusher] Skipped - pending operation for entry', entryId);
                return;
            }

            // Skip if this entry is locked (recently interacted)
            const entryLockTime = lockedEntriesRef.current.get(entryId);
            if (entryLockTime && now - entryLockTime < 3000) {
                console.log('[Pusher] Skipped - entry locked', entryId);
                return;
            }

            // Skip if this side is locked (checkbox operation in progress)
            const sideLockTime = lockedSidesRef.current.get(entrySide);
            if (sideLockTime && now - sideLockTime < 3000) {
                console.log('[Pusher] Skipped - side locked', entrySide);
                return;
            }

            // Apply the update
            setEntries(prev => {
                // Check if this update is already applied (from optimistic update)
                const current = prev.find(e => e.id === entryId);
                if (current &&
                    current.text === data.entry.text &&
                    current.checked === data.entry.checked) {
                    return prev;
                }
                return prev.map(e => e.id === entryId ? data.entry : e);
            });
        });

        // Listen for full sync (e.g., after initialization)
        channel.bind('sync-all', (data: { entries: QueueEntry[] }) => {
            console.log('Received full sync:', data);

            // Only sync if no pending operations at all
            if (pendingOpsRef.current.size === 0 && lockedEntriesRef.current.size === 0) {
                setEntries(data.entries);
            } else {
                console.log('[Pusher] Skipped full sync - operations in progress');
            }
        });

        // Cleanup on unmount
        return () => {
            if (pusherRef.current) {
                pusherRef.current.unsubscribe('queue-channel');
                pusherRef.current.disconnect();
            }
            // Clear all locks
            pendingOpsRef.current.clear();
            lockedEntriesRef.current.clear();
            lockedSidesRef.current.clear();
        };
    }, []);

    // Update entry with optimistic update for instant feedback
    const updateEntry = async (id: number, updates: Partial<QueueEntry>) => {
        const lockTime = Date.now();

        // Mark as pending and lock this entry
        pendingOpsRef.current.add(id);
        lockedEntriesRef.current.set(id, lockTime);

        // Optimistic update - instant feedback for user
        setEntries(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));

        try {
            const response = await fetch(`/api/queue/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });

            if (response.status === 429) {
                console.warn('Rate limited on update');
            } else if (!pusherRef.current) {
                // If no Pusher, update from server response
                const data = await response.json();
                setEntries(prev => prev.map(e => e.id === id ? data : e));
            }
            // Otherwise Pusher will broadcast the update to all clients
        } catch (error) {
            console.error('Error updating entry:', error);
            // Keep optimistic update - don't fetch from server to avoid revert
        } finally {
            // Remove from pending
            pendingOpsRef.current.delete(id);

            // Keep locked for 2 more seconds after API completes
            setTimeout(() => {
                if (lockedEntriesRef.current.get(id) === lockTime) {
                    lockedEntriesRef.current.delete(id);
                }
            }, 2000);
        }
    };

    // Debounced text update to reduce API calls
    const debouncedUpdateText = useCallback(
        debounce((id: number, text: string) => {
            updateEntry(id, { text });
        }, 500), // Wait 500ms after user stops typing - faster response
        []
    );

    // Handle text input with normalization and debouncing
    const handleTextInput = (id: number, rawText: string) => {
        const normalized = normalizeToEnglish(rawText);
        const lockTime = Date.now();

        // Lock this entry to prevent Pusher updates from overwriting
        lockedEntriesRef.current.set(id, lockTime);

        // Update UI immediately for responsive feel
        setEntries(prev => prev.map(e => e.id === id ? { ...e, text: normalized } : e));

        // Debounce the actual API call
        debouncedUpdateText(id, normalized);
    };

    // Handle checkbox change - only one checked per cab
    const handleCheckboxChange = async (rowIndex: number, side: string, checked: boolean) => {
        console.log(`[DEBUG] handleCheckboxChange: rowIndex=${rowIndex}, side=${side}, checked=${checked}`);
        console.log(`[DEBUG] Current entries count: ${entries.length}`);

        const lockTime = Date.now();

        // Lock this entire side to prevent Pusher override during checkbox operations
        lockedSidesRef.current.set(side, lockTime);

        // Capture fresh state
        let currentEntries: QueueEntry[] = [];

        if (checked) {
            // When checking: uncheck all others in the same cab, check this one
            setEntries(prev => {
                currentEntries = prev; // Capture FRESH state!
                console.log(`[DEBUG] Before setEntries (checking): ${prev.filter(e => e.side === side).map(e => `row${e.rowIndex}:${e.checked}`).join(', ')}`);
                const updated = prev.map(e => {
                    if (e.side === side) {
                        if (e.rowIndex === rowIndex) {
                            return { ...e, checked: true };
                        } else if (e.checked) {
                            return { ...e, checked: false };
                        }
                    }
                    return e;
                });
                console.log(`[DEBUG] After setEntries (checking): ${updated.filter(e => e.side === side).map(e => `row${e.rowIndex}:${e.checked}`).join(', ')}`);
                return updated;
            });

            // DEDUPLICATE: Keep only latest entry per (rowIndex, side, position)
            const seenKeys = new Map<string, QueueEntry>();
            currentEntries.forEach(entry => {
                const key = `${entry.rowIndex}-${entry.side}-${entry.position}`;
                const existing = seenKeys.get(key);
                // Keep entry with larger ID (newer)
                if (!existing || entry.id > existing.id) {
                    seenKeys.set(key, entry);
                }
            });
            const uniqueEntries = Array.from(seenKeys.values());
            console.log(`[DEBUG] Deduplicated: ${currentEntries.length} -> ${uniqueEntries.length} entries`);

            // Send API calls: check this row, uncheck all others in the cab
            const entriesInSide = uniqueEntries.filter(e => e.side === side);

            // Mark all entries in this side as pending
            entriesInSide.forEach(e => pendingOpsRef.current.add(e.id));

            console.log(`[DEBUG] Sending API calls for ${entriesInSide.length} entries in side ${side}`);
            const updatePromises = entriesInSide.map(entry => {
                const shouldCheck = entry.rowIndex === rowIndex;
                console.log(`[DEBUG] API call: entry ${entry.id} (row${entry.rowIndex}) -> checked: ${shouldCheck}`);
                return fetch(`/api/queue/${entry.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ checked: shouldCheck })
                }).catch(error => {
                    console.error(`[DEBUG] API call failed for entry ${entry.id}:`, error);
                    return Promise.reject(error);
                });
            });

            try {
                await Promise.all(updatePromises);
                console.log(`[DEBUG] All API calls completed successfully`);
            } catch (error) {
                console.error(`[DEBUG] Some API calls failed:`, error);
            } finally {
                // Remove all entries from pending
                entriesInSide.forEach(e => pendingOpsRef.current.delete(e.id));
            }
        } else {
            // When unchecking: just uncheck this row
            setEntries(prev => {
                currentEntries = prev; // Capture FRESH state!
                console.log(`[DEBUG] Before setEntries (unchecking): ${prev.filter(e => e.side === side).map(e => `row${e.rowIndex}:${e.checked}`).join(', ')}`);
                const updated = prev.map(e => {
                    if (e.side === side && e.rowIndex === rowIndex) {
                        return { ...e, checked: false };
                    }
                    return e;
                });
                console.log(`[DEBUG] After setEntries (unchecking): ${updated.filter(e => e.side === side).map(e => `row${e.rowIndex}:${e.checked}`).join(', ')}`);
                return updated;
            });

            // DEDUPLICATE
            const seenKeys = new Map<string, QueueEntry>();
            currentEntries.forEach(entry => {
                const key = `${entry.rowIndex}-${entry.side}-${entry.position}`;
                const existing = seenKeys.get(key);
                if (!existing || entry.id > existing.id) {
                    seenKeys.set(key, entry);
                }
            });
            const uniqueEntries = Array.from(seenKeys.values());
            console.log(`[DEBUG] Deduplicated: ${currentEntries.length} -> ${uniqueEntries.length} entries`);

            const entriesToUpdate = uniqueEntries.filter(e => e.side === side && e.rowIndex === rowIndex);

            // Mark entries as pending
            entriesToUpdate.forEach(e => pendingOpsRef.current.add(e.id));

            console.log(`[DEBUG] Sending API calls for ${entriesToUpdate.length} entries to uncheck`);
            const updatePromises = entriesToUpdate.map(entry => {
                console.log(`[DEBUG] API call: entry ${entry.id} (row${entry.rowIndex}) -> checked: false`);
                return fetch(`/api/queue/${entry.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ checked: false })
                }).catch(error => {
                    console.error(`[DEBUG] API call failed for entry ${entry.id}:`, error);
                    return Promise.reject(error);
                });
            });

            try {
                await Promise.all(updatePromises);
                console.log(`[DEBUG] All API calls completed successfully`);
            } catch (error) {
                console.error(`[DEBUG] Some API calls failed:`, error);
            } finally {
                // Remove entries from pending
                entriesToUpdate.forEach(e => pendingOpsRef.current.delete(e.id));
            }
        }

        // Keep side locked for 3 more seconds after operations complete
        setTimeout(() => {
            if (lockedSidesRef.current.get(side) === lockTime) {
                lockedSidesRef.current.delete(side);
                console.log(`[DEBUG] Side lock released: ${side}`);
            }
        }, 3000);
    };

    // Delete (clear) entry - only clear the text, keep the entry
    const clearEntry = async (id: number) => {
        const lockTime = Date.now();

        // Lock this entry
        pendingOpsRef.current.add(id);
        lockedEntriesRef.current.set(id, lockTime);

        try {
            // Optimistic update - clear text only, keep entry structure
            setEntries(prev => prev.map(e =>
                e.id === id ? { ...e, text: '' } : e
            ));

            const response = await fetch(`/api/queue/${id}`, {
                method: 'DELETE'
            });

            if (response.status === 429) {
                console.warn('Rate limited on delete');
                return;
            }

            // Optimistic update already applied - no need to fetch from server
            console.log('[DEBUG] clearEntry complete');
        } catch (error) {
            console.error('Error clearing entry:', error);
        } finally {
            // Remove from pending
            pendingOpsRef.current.delete(id);

            // Keep locked for 2 more seconds
            setTimeout(() => {
                if (lockedEntriesRef.current.get(id) === lockTime) {
                    lockedEntriesRef.current.delete(id);
                }
            }, 2000);
        }
    };

    // Clear entire row (both P1 and P2) - parallel for speed
    const clearRow = async (rowIndex: number, side: string) => {
        const lockTime = Date.now();

        // Lock this side
        lockedSidesRef.current.set(side, lockTime);

        // Capture fresh entries from state
        let currentEntries: QueueEntry[] = [];
        setEntries(prev => {
            currentEntries = prev;
            return prev.map(e => {
                if (e.side === side && e.rowIndex === rowIndex) {
                    return { ...e, text: '' };
                }
                return e;
            });
        });

        // Find entries to delete from FRESH state
        const p1Entry = currentEntries.find(
            e => e.rowIndex === rowIndex && e.side === side && e.position === 'P1'
        );
        const p2Entry = currentEntries.find(
            e => e.rowIndex === rowIndex && e.side === side && e.position === 'P2'
        );

        // Mark entries as pending
        if (p1Entry) pendingOpsRef.current.add(p1Entry.id);
        if (p2Entry) pendingOpsRef.current.add(p2Entry.id);

        // Delete both in parallel (not sequential!)
        const deletePromises = [];
        if (p1Entry) {
            deletePromises.push(
                fetch(`/api/queue/${p1Entry.id}`, { method: 'DELETE' })
            );
        }
        if (p2Entry) {
            deletePromises.push(
                fetch(`/api/queue/${p2Entry.id}`, { method: 'DELETE' })
            );
        }

        try {
            await Promise.all(deletePromises);

            // Optimistic update already applied - no need to fetch from server
            console.log('[DEBUG] clearRow complete');
        } finally {
            // Remove entries from pending
            if (p1Entry) pendingOpsRef.current.delete(p1Entry.id);
            if (p2Entry) pendingOpsRef.current.delete(p2Entry.id);

            // Keep side locked for 3 more seconds
            setTimeout(() => {
                if (lockedSidesRef.current.get(side) === lockTime) {
                    lockedSidesRef.current.delete(side);
                }
            }, 3000);
        }
    };

    // Get entry by position
    const getEntry = (rowIndex: number, side: string, position: string) => {
        return entries.find(
            e => e.rowIndex === rowIndex && e.side === side && e.position === position
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-xl">Đang tải...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-red-50">
                <div className="max-w-2xl w-full bg-white border-2 border-red-300 rounded-lg p-8 shadow-lg">
                    <h1 className="text-2xl font-bold text-red-600 mb-4">⚠️ Lỗi Kết Nối Database</h1>
                    <div className="text-gray-700 mb-4">
                        <p className="mb-2"><strong>Chi tiết lỗi:</strong></p>
                        <p className="bg-gray-100 p-3 rounded text-sm font-mono">{error}</p>
                    </div>

                    {error.includes('SQLite') || error.includes('SQLITE') ? (
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                            <p className="font-semibold text-yellow-800 mb-2">💡 Giải pháp:</p>
                            <p className="text-yellow-700 text-sm">
                                SQLite không hoạt động trên Vercel. Bạn cần chuyển sang PostgreSQL.
                            </p>
                        </div>
                    ) : null}

                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                        <p><strong>Các bước khắc phục:</strong></p>
                        <ol className="list-decimal list-inside space-y-1 ml-2">
                            <li>Vào Vercel Dashboard → Storage → Create Database → Postgres</li>
                            <li>Copy file <code className="bg-gray-100 px-1">prisma/schema.postgresql.prisma</code></li>
                            <li>Paste vào <code className="bg-gray-100 px-1">prisma/schema.prisma</code></li>
                            <li>Commit và push code lên GitHub</li>
                            <li>Chạy: <code className="bg-gray-100 px-1">npx prisma migrate deploy</code></li>
                        </ol>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                        >
                            🔄 Thử Lại
                        </button>
                        <a
                            href="https://github.com/hidr0c/vhmqueueboard/blob/main/SWITCH-TO-POSTGRESQL.md"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
                        >
                            📖 Xem Hướng Dẫn
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 max-w-7xl bg-white min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Bảng Hàng Đợi VHM</h1>
                <div className="flex items-center gap-4">

                    <button
                        onClick={() => {
                            setShowHistory(!showHistory);
                            if (!showHistory) fetchHistory();
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                    >
                        {showHistory ? 'Ẩn lịch sử' : 'Xem lịch sử'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-8">
                {/* Cab trái */}
                <div className="border-2 border-gray-400 rounded-lg p-4 bg-gray-50">
                    <h2 className="text-2xl font-bold text-center mb-4 bg-blue-500 text-white py-3 rounded">
                        Cab Trái
                    </h2>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                        <div className="text-center font-semibold bg-blue-200 py-2 rounded text-gray-800">P1</div>
                        <div className="text-center font-semibold bg-blue-200 py-2 rounded text-gray-800">P2</div>
                    </div>

                    {Array.from({ length: 12 }, (_, rowIndex) => {
                        const p1Entry = getEntry(rowIndex, 'left', 'P1');
                        const p2Entry = getEntry(rowIndex, 'left', 'P2');
                        if (!p1Entry || !p2Entry) return null;

                        return (
                            <div key={`left-${rowIndex}`} className="mb-3">
                                {/* Row with checkbox, P1, P2, and single delete button */}
                                <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 items-center">
                                    {/* Checkbox */}
                                    <input
                                        type="checkbox"
                                        checked={p1Entry.checked}
                                        onChange={(e) => handleCheckboxChange(rowIndex, 'left', e.target.checked)}
                                        className="w-5 h-5 cursor-pointer"
                                    />

                                    {/* P1 Input */}
                                    <div className="border-2 border-gray-400 rounded p-2 bg-white shadow-sm">
                                        <input
                                            type="text"
                                            value={p1Entry.text}
                                            onChange={(e) => handleTextInput(p1Entry.id, e.target.value)}
                                            className="w-full px-2 py-2 border-2 border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500 text-gray-800"
                                            placeholder="P1"
                                        />
                                    </div>

                                    {/* P2 Input */}
                                    <div className="border-2 border-gray-400 rounded p-2 bg-white shadow-sm">
                                        <input
                                            type="text"
                                            value={p2Entry.text}
                                            onChange={(e) => handleTextInput(p2Entry.id, e.target.value)}
                                            className="w-full px-2 py-2 border-2 border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500 text-gray-800"
                                            placeholder="P2"
                                        />
                                    </div>

                                    {/* Delete Row Button */}
                                    <button
                                        onClick={() => clearRow(rowIndex, 'left')}
                                        className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-semibold text-sm"
                                        title="Xóa cả hàng"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Cab phải */}
                <div className="border-2 border-gray-400 rounded-lg p-4 bg-gray-50">
                    <h2 className="text-2xl font-bold text-center mb-4 bg-green-600 text-white py-3 rounded">
                        Cab Phải
                    </h2>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                        <div className="text-center font-semibold bg-green-200 py-2 rounded text-gray-800">P1</div>
                        <div className="text-center font-semibold bg-green-200 py-2 rounded text-gray-800">P2</div>
                    </div>

                    {Array.from({ length: 12 }, (_, rowIndex) => {
                        const p1Entry = getEntry(rowIndex, 'right', 'P1');
                        const p2Entry = getEntry(rowIndex, 'right', 'P2');
                        if (!p1Entry || !p2Entry) return null;

                        return (
                            <div key={`right-${rowIndex}`} className="mb-3">
                                {/* Row with checkbox, P1, P2, and single delete button */}
                                <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 items-center">
                                    {/* Checkbox */}
                                    <input
                                        type="checkbox"
                                        checked={p1Entry.checked}
                                        onChange={(e) => handleCheckboxChange(rowIndex, 'right', e.target.checked)}
                                        className="w-5 h-5 cursor-pointer"
                                    />

                                    {/* P1 Input */}
                                    <div className="border-2 border-gray-400 rounded p-2 bg-white shadow-sm">
                                        <input
                                            type="text"
                                            value={p1Entry.text}
                                            onChange={(e) => handleTextInput(p1Entry.id, e.target.value)}
                                            className="w-full px-2 py-2 border-2 border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500 text-gray-800"
                                            placeholder="P1"
                                        />
                                    </div>

                                    {/* P2 Input */}
                                    <div className="border-2 border-gray-400 rounded p-2 bg-white shadow-sm">
                                        <input
                                            type="text"
                                            value={p2Entry.text}
                                            onChange={(e) => handleTextInput(p2Entry.id, e.target.value)}
                                            className="w-full px-2 py-2 border-2 border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500 text-gray-800"
                                            placeholder="P2"
                                        />
                                    </div>

                                    {/* Delete Row Button */}
                                    <button
                                        onClick={() => clearRow(rowIndex, 'right')}
                                        className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-semibold text-sm"
                                        title="Xóa cả hàng"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* History Log */}
            {showHistory && (
                <div className="border-2 border-gray-400 rounded-lg p-4 bg-white shadow-lg">
                    <h2 className="text-2xl font-bold mb-4 text-gray-800">Lịch Sử Thay Đổi</h2>
                    <div className="max-h-96 overflow-y-auto">
                        {history.length === 0 ? (
                            <p className="text-gray-600">Chưa có lịch sử thay đổi</p>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="bg-gray-700 text-white sticky top-0">
                                    <tr>
                                        <th className="p-2 text-left">Thời gian</th>
                                        <th className="p-2 text-left">Vị trí</th>
                                        <th className="p-2 text-left">Hành động</th>
                                        <th className="p-2 text-left">Giá trị cũ</th>
                                        <th className="p-2 text-left">Giá trị mới</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.map(log => (
                                        <tr key={log.id} className="border-b border-gray-300 hover:bg-gray-100">
                                            <td className="p-2 text-gray-700">
                                                {new Date(log.timestamp).toLocaleString('vi-VN')}
                                            </td>
                                            <td className="p-2 text-gray-700">
                                                {log.side === 'left' ? 'Cab Trái' : 'Cab Phải'} - {log.position} - #{log.rowIndex + 1}
                                            </td>
                                            <td className="p-2 text-gray-700">
                                                {log.action === 'checked' && '✓ Đánh dấu'}
                                                {log.action === 'unchecked' && '✗ Bỏ đánh dấu'}
                                                {log.action === 'text_changed' && '✎ Thay đổi nội dung'}
                                            </td>
                                            <td className="p-2 text-gray-600">{log.oldValue || '-'}</td>
                                            <td className="p-2 font-semibold text-gray-800">{log.newValue || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
