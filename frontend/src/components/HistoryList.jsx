import React from 'react';
import { History, Trash2, Download, Eye } from 'lucide-react';

export function HistoryList({ tasks, onView, onDelete, onExport = null }) {
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-dark-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-blue-500" />
          <span className="font-medium">History</span>
        </div>
        <span className="text-sm text-gray-400">{tasks.length} tasks</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tasks.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No history yet</p>
            <p className="text-sm mt-2">Run some tasks to see them here</p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {tasks.map((task) => (
              <div
                key={task.task_id}
                className="p-3 bg-dark-secondary rounded-lg border border-dark-border hover:border-blue-500 cursor-pointer transition-colors"
                onClick={() => onView(task.task_id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{task.task}</p>
                    <p className="text-xs text-gray-500 mt-1">{task.created_at}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    task.status === 'completed' ? 'bg-green-900 text-green-400' :
                    task.status === 'success' ? 'bg-green-900 text-green-400' :
                    task.status === 'error' ? 'bg-red-900 text-red-400' :
                    task.status === 'running' ? 'bg-yellow-900 text-yellow-400' :
                    task.status === 'pending' ? 'bg-blue-900 text-blue-400' :
                    'bg-gray-700 text-gray-400'
                  }`}>
                    {task.status}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); onView(task.task_id); }}
                    className="p-1 hover:bg-dark-border rounded"
                    title="View"
                  >
                    <Eye className="w-4 h-4 text-gray-400" />
                  </button>
                  {onExport && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onExport(task.task_id); }}
                      className="p-1 hover:bg-dark-border rounded"
                      title="Export"
                    >
                      <Download className="w-4 h-4 text-gray-400" />
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(task.task_id); }}
                    className="p-1 hover:bg-dark-border rounded"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
