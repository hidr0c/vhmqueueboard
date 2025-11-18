'use client';

import { useEffect, useState } from 'react';

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

    // Fetch entries
    const fetchEntries = async () => {
        try {
            const response = await fetch('/api/queue');
            const data = await response.json();
            setEntries(data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching entries:', error);
        }
    };

    // Fetch history
    const fetchHistory = async () => {
        try {
            const response = await fetch('/api/history');
            const data = await response.json();
            setHistory(data);
        } catch (error) {
            console.error('Error fetching history:', error);
        }
    };

    // Initialize data on mount
    useEffect(() => {
        const initializeData = async () => {
            // Try to fetch existing data
            const response = await fetch('/api/queue');
            const data = await response.json();

            // If no data, initialize
            if (data.length === 0) {
                await fetch('/api/queue', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'initialize' })
                });
            }

            fetchEntries();
            fetchHistory();
        };

        initializeData();
    }, []);

    // Real-time polling
    useEffect(() => {
        const interval = setInterval(() => {
            fetchEntries();
            if (showHistory) {
                fetchHistory();
            }
        }, 2000); // Poll every 2 seconds

        return () => clearInterval(interval);
    }, [showHistory]);

    // Update entry
    const updateEntry = async (id: number, updates: Partial<QueueEntry>) => {
        try {
            await fetch(`/api/queue/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            fetchEntries();
            fetchHistory();
        } catch (error) {
            console.error('Error updating entry:', error);
        }
    };

    // Handle checkbox change with single selection per cab
    const handleCheckboxChange = async (rowIndex: number, side: string, checked: boolean) => {
        if (checked) {
            // When checking a row, uncheck all other rows in the same cab
            const entriesToUpdate = entries.filter(e => e.side === side);
            
            for (const entry of entriesToUpdate) {
                if (entry.rowIndex === rowIndex) {
                    // Check this row
                    await updateEntry(entry.id, { checked: true });
                } else if (entry.checked) {
                    // Uncheck other rows
                    await updateEntry(entry.id, { checked: false });
                }
            }
        } else {
            // When unchecking, just uncheck this row
            const entriesToUncheck = entries.filter(
                e => e.side === side && e.rowIndex === rowIndex
            );
            for (const entry of entriesToUncheck) {
                await updateEntry(entry.id, { checked: false });
            }
        }
    };

    // Delete (clear) entry
    const clearEntry = async (id: number) => {
        try {
            await fetch(`/api/queue/${id}`, {
                method: 'DELETE'
            });
            fetchEntries();
            fetchHistory();
        } catch (error) {
            console.error('Error clearing entry:', error);
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
                                {/* P1 and P2 inputs with checkbox */}
                                <div className="grid grid-cols-[auto_1fr_1fr] gap-2 items-start">
                                    {/* Checkbox */}
                                    <input
                                        type="checkbox"
                                        checked={p1Entry.checked}
                                        onChange={(e) => handleCheckboxChange(rowIndex, 'left', e.target.checked)}
                                        className="w-5 h-5 cursor-pointer mt-2"
                                    />
                                    
                                    {/* P1 Input */}
                                    <div className="border-2 border-gray-400 rounded p-2 bg-white shadow-sm">
                                        <input
                                            type="text"
                                            value={p1Entry.text}
                                            onChange={(e) => updateEntry(p1Entry.id, { text: e.target.value })}
                                            className="w-full px-2 py-2 border-2 border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500 text-gray-800"
                                        />
                                        <button
                                            onClick={() => clearEntry(p1Entry.id)}
                                            className="mt-2 text-sm text-red-600 hover:text-red-800 font-semibold"
                                        >
                                            Xóa
                                        </button>
                                    </div>
                                    
                                    {/* P2 Input */}
                                    <div className="border-2 border-gray-400 rounded p-2 bg-white shadow-sm">
                                        <input
                                            type="text"
                                            value={p2Entry.text}
                                            onChange={(e) => updateEntry(p2Entry.id, { text: e.target.value })}
                                            className="w-full px-2 py-2 border-2 border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500 text-gray-800"
                                        />
                                        <button
                                            onClick={() => clearEntry(p2Entry.id)}
                                            className="mt-2 text-sm text-red-600 hover:text-red-800 font-semibold"
                                        >
                                            Xóa
                                        </button>
                                    </div>
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
                                {/* P1 and P2 inputs with checkbox */}
                                <div className="grid grid-cols-[auto_1fr_1fr] gap-2 items-start">
                                    {/* Checkbox */}
                                    <input
                                        type="checkbox"
                                        checked={p1Entry.checked}
                                        onChange={(e) => handleCheckboxChange(rowIndex, 'right', e.target.checked)}
                                        className="w-5 h-5 cursor-pointer mt-2"
                                    />
                                    
                                    {/* P1 Input */}
                                    <div className="border-2 border-gray-400 rounded p-2 bg-white shadow-sm">
                                        <input
                                            type="text"
                                            value={p1Entry.text}
                                            onChange={(e) => updateEntry(p1Entry.id, { text: e.target.value })}
                                            className="w-full px-2 py-2 border-2 border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500 text-gray-800"
                                        />
                                        <button
                                            onClick={() => clearEntry(p1Entry.id)}
                                            className="mt-2 text-sm text-red-600 hover:text-red-800 font-semibold"
                                        >
                                            Xóa
                                        </button>
                                    </div>
                                    
                                    {/* P2 Input */}
                                    <div className="border-2 border-gray-400 rounded p-2 bg-white shadow-sm">
                                        <input
                                            type="text"
                                            value={p2Entry.text}
                                            onChange={(e) => updateEntry(p2Entry.id, { text: e.target.value })}
                                            className="w-full px-2 py-2 border-2 border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500 text-gray-800"
                                        />
                                        <button
                                            onClick={() => clearEntry(p2Entry.id)}
                                            className="mt-2 text-sm text-red-600 hover:text-red-800 font-semibold"
                                        >
                                            Xóa
                                        </button>
                                    </div>
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
