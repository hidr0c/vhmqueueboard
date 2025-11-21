'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { normalizeToEnglish } from '@/lib/textUtils';
import { debounce } from '@/lib/debounce';

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
    const [isPolling, setIsPolling] = useState(true);
    const abortControllerRef = useRef<AbortController | null>(null);
    const isTypingRef = useRef<boolean>(false);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Fetch entries with abort signal
    const fetchEntries = async (signal?: AbortSignal) => {
        try {
            const response = await fetch('/api/queue', { signal });
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
                // Only update if user is not currently typing to avoid interruption
                if (!isTypingRef.current) {
                    setEntries(data);
                }
                setError(null);
            } else {
                console.error('API returned non-array data:', data);
                setEntries([]);
                setError('Invalid data format received from server');
            }
            setLoading(false);
        } catch (error: any) {
            if (error.name === 'AbortError') {
                // Request was aborted, ignore
                return;
            }
            console.error('Error fetching entries:', error);
            setError('Cannot connect to server. Please check your internet connection.');
            setEntries([]);
            setLoading(false);
        }
    };

    // Fetch history with abort signal
    const fetchHistory = async (signal?: AbortSignal) => {
        try {
            const response = await fetch('/api/history', { signal });
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
            if (error.name === 'AbortError') {
                return;
            }
            console.error('Error fetching history:', error);
            setHistory([]);
        }
    };

    // Initialize data on mount
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

        // Cleanup on unmount
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        };
    }, []);

    // Smart polling with abort controller
    useEffect(() => {
        if (!isPolling) return;

        const interval = setInterval(() => {
            // Cancel previous request if still pending
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            // Create new abort controller
            abortControllerRef.current = new AbortController();

            fetchEntries(abortControllerRef.current.signal);
            if (showHistory) {
                fetchHistory(abortControllerRef.current.signal);
            }
        }, 5000); // Poll every 5 seconds for smoother input experience

        return () => {
            clearInterval(interval);
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [showHistory, isPolling]);

    // Update entry
    const updateEntry = async (id: number, updates: Partial<QueueEntry>) => {
        try {
            const response = await fetch(`/api/queue/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });

            if (response.status === 429) {
                console.warn('Rate limited on update');
                return;
            }

            // Optimistic update only - let polling handle sync
            setEntries(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
        } catch (error) {
            console.error('Error updating entry:', error);
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

        // Mark as typing to prevent polling from overwriting
        isTypingRef.current = true;

        // Clear previous timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Set timeout to mark typing as done after user stops
        typingTimeoutRef.current = setTimeout(() => {
            isTypingRef.current = false;
        }, 1000);

        // Update UI immediately for responsive feel
        setEntries(prev => prev.map(e => e.id === id ? { ...e, text: normalized } : e));

        // Debounce the actual API call
        debouncedUpdateText(id, normalized);
    };

    // Handle checkbox change with single selection per cab and reordering
    const handleCheckboxChange = async (rowIndex: number, side: string, checked: boolean) => {
        if (checked) {
            // Optimistic update - instant UI feedback
            setEntries(prev => prev.map(e => {
                if (e.side === side) {
                    if (e.rowIndex === rowIndex) {
                        return { ...e, checked: true };
                    } else if (e.checked) {
                        return { ...e, checked: false };
                    }
                }
                return e;
            }));

            // Send API calls in parallel (not sequential)
            const entriesToUpdate = entries.filter(e => e.side === side);
            const updatePromises = entriesToUpdate.map(entry => {
                if (entry.rowIndex === rowIndex) {
                    return updateEntry(entry.id, { checked: true });
                } else if (entry.checked) {
                    return updateEntry(entry.id, { checked: false });
                }
                return Promise.resolve();
            });

            // Wait for all updates to complete
            await Promise.all(updatePromises);
        } else {
            // Optimistic update for unchecking and reordering
            const sideEntries = entries.filter(e => e.side === side);
            const rowGroups = new Map<number, QueueEntry[]>();
            sideEntries.forEach(entry => {
                if (!rowGroups.has(entry.rowIndex)) {
                    rowGroups.set(entry.rowIndex, []);
                }
                rowGroups.get(entry.rowIndex)!.push(entry);
            });

            const sortedRowIndices = Array.from(rowGroups.keys()).sort((a, b) => a - b);
            const uncheckedRowEntries = rowGroups.get(rowIndex) || [];
            const otherRowIndices = sortedRowIndices.filter(idx => idx !== rowIndex);

            // Calculate new indices
            let newRowIndex = 0;
            const newIndices = new Map<number, number>();

            for (const oldRowIndex of otherRowIndices) {
                newIndices.set(oldRowIndex, newRowIndex);
                newRowIndex++;
            }
            newIndices.set(rowIndex, newRowIndex);

            // Optimistic UI update - instant feedback (PRESERVE TEXT!)
            setEntries(prev => prev.map(e => {
                if (e.side === side) {
                    const newIdx = newIndices.get(e.rowIndex);
                    if (newIdx !== undefined) {
                        return {
                            ...e, // Keep all existing data including text!
                            rowIndex: newIdx,
                            checked: e.rowIndex === rowIndex ? false : e.checked
                        };
                    }
                }
                return e;
            }));

            // Send all API calls in parallel
            const updatePromises: Promise<void>[] = [];

            // Uncheck current row
            uncheckedRowEntries.forEach(entry => {
                updatePromises.push(updateEntry(entry.id, { checked: false }));
            });

            // Reorder all rows
            for (const oldRowIndex of otherRowIndices) {
                const rowEntries = rowGroups.get(oldRowIndex)!;
                const targetIndex = newIndices.get(oldRowIndex)!;
                rowEntries.forEach(entry => {
                    updatePromises.push(updateEntry(entry.id, { rowIndex: targetIndex }));
                });
            }

            // Move unchecked row to end
            const finalIndex = newIndices.get(rowIndex)!;
            uncheckedRowEntries.forEach(entry => {
                updatePromises.push(updateEntry(entry.id, { rowIndex: finalIndex }));
            });

            // Wait for all in parallel
            await Promise.all(updatePromises);
        }
    };

    // Delete (clear) entry - only clear the text, keep the entry
    const clearEntry = async (id: number) => {
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
        } catch (error) {
            console.error('Error clearing entry:', error);
        }
    };

    // Clear entire row (both P1 and P2)
    const clearRow = async (rowIndex: number, side: string) => {
        const p1Entry = getEntry(rowIndex, side, 'P1');
        const p2Entry = getEntry(rowIndex, side, 'P2');

        if (p1Entry) await clearEntry(p1Entry.id);
        if (p2Entry) await clearEntry(p2Entry.id);
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
                                {/* Row with checkbox, P1 with delete, P2 with delete, and delete row */}
                                <div className="grid grid-cols-[auto_1fr_auto_1fr_auto_auto] gap-2 items-center">
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

                                    {/* Delete P1 Button */}
                                    <button
                                        onClick={() => clearEntry(p1Entry.id)}
                                        className="px-2 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 font-semibold text-xs"
                                        title="Xóa P1"
                                    >
                                        ✕
                                    </button>

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

                                    {/* Delete P2 Button */}
                                    <button
                                        onClick={() => clearEntry(p2Entry.id)}
                                        className="px-2 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 font-semibold text-xs"
                                        title="Xóa P2"
                                    >
                                        ✕
                                    </button>

                                    {/* Delete Entire Row Button */}
                                    <button
                                        onClick={() => clearRow(rowIndex, 'left')}
                                        className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-semibold text-sm"
                                        title="Xóa cả hàng"
                                    >
                                        ✕✕
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
                                {/* Row with checkbox, P1 with delete, P2 with delete, and delete row */}
                                <div className="grid grid-cols-[auto_1fr_auto_1fr_auto_auto] gap-2 items-center">
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

                                    {/* Delete P1 Button */}
                                    <button
                                        onClick={() => clearEntry(p1Entry.id)}
                                        className="px-2 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 font-semibold text-xs"
                                        title="Xóa P1"
                                    >
                                        ✕
                                    </button>

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

                                    {/* Delete P2 Button */}
                                    <button
                                        onClick={() => clearEntry(p2Entry.id)}
                                        className="px-2 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 font-semibold text-xs"
                                        title="Xóa P2"
                                    >
                                        ✕
                                    </button>

                                    {/* Delete Entire Row Button */}
                                    <button
                                        onClick={() => clearRow(rowIndex, 'right')}
                                        className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-semibold text-sm"
                                        title="Xóa cả hàng"
                                    >
                                        ✕✕
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
