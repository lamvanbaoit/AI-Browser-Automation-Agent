import { useState, useEffect } from 'react';
import { Monitor, RefreshCw, Loader2, CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight, Image, Zap, Eye, MousePointerClick, MessageSquare } from 'lucide-react';

function ProjectPitch() {
  const steps = [
    { icon: MessageSquare, label: 'Nhập task', desc: 'Viết yêu cầu bằng tiếng tự nhiên', color: 'text-blue-400' },
    { icon: Zap, label: 'AI phân tích', desc: 'LLM hiểu ý định & lên kế hoạch', color: 'text-purple-400' },
    { icon: MousePointerClick, label: 'Browser thực thi', desc: 'Tự động click, gõ, điều hướng', color: 'text-yellow-400' },
    { icon: Eye, label: 'Trả kết quả', desc: 'Kết quả văn bản trực tiếp (vision tắt)', color: 'text-green-400' },
  ];

  const features = [
    { emoji: '🧠', text: 'MiniMax M2.5 via VNG Cloud MaaS · ~3–7s/bước' },
    { emoji: '🌐', text: 'Điều khiển Chromium thật (không phải giả lập)' },
    { emoji: '📸', text: 'Vision đang tắt — agent đọc DOM thay vì screenshot' },
    { emoji: '⚡', text: 'Realtime updates qua WebSocket' },
    { emoji: '🔌', text: 'Đổi model qua .env — hỗ trợ các model VNG Cloud MaaS' },
  ];

  const stack = [
    { name: 'FastAPI', color: 'bg-green-900 text-green-300 border-green-700' },
    { name: 'browser-use', color: 'bg-purple-900 text-purple-300 border-purple-700' },
    { name: 'LiteLLM', color: 'bg-blue-900 text-blue-300 border-blue-700' },
    { name: 'React + Vite', color: 'bg-cyan-900 text-cyan-300 border-cyan-700' },
    { name: 'WebSocket', color: 'bg-yellow-900 text-yellow-300 border-yellow-700' },
  ];

  return (
    <div className="w-full h-full overflow-y-auto p-6 text-left space-y-5">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-3 mb-2">
          <Monitor className="w-8 h-8 text-blue-400" />
          <h1 className="text-2xl font-bold text-white">AI Browser Automation Agent</h1>
        </div>
        <p className="text-gray-400 text-sm max-w-md mx-auto">
          Gõ một câu lệnh — AI tự mở trình duyệt, điều hướng web, và trả về kết quả
        </p>
      </div>

      {/* How it works */}
      <div className="bg-dark-secondary border border-dark-border rounded-xl p-4">
        <p className="text-xs text-gray-500 uppercase font-semibold mb-3">Cách hoạt động</p>
        <div className="grid grid-cols-4 gap-2">
          {steps.map((s, i) => (
            <div key={i} className="flex flex-col items-center text-center gap-1">
              <div className="w-10 h-10 rounded-full bg-dark-primary border border-dark-border flex items-center justify-center">
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <span className="text-xs font-medium text-gray-200">{s.label}</span>
              <span className="text-[10px] text-gray-500 leading-tight">{s.desc}</span>
              {i < steps.length - 1 && (
                <div className="hidden" />
              )}
            </div>
          ))}
        </div>
        {/* Arrow row */}
        <div className="grid grid-cols-4 gap-2 mt-1">
          {steps.map((_, i) => (
            <div key={i} className="flex justify-center">
              {i < steps.length - 1 && <span className="text-gray-600 text-lg leading-none">→</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="bg-dark-secondary border border-dark-border rounded-xl p-4">
        <p className="text-xs text-gray-500 uppercase font-semibold mb-3">Tính năng nổi bật</p>
        <ul className="space-y-1.5">
          {features.map((f, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
              <span>{f.emoji}</span>
              <span>{f.text}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Tech stack */}
      <div className="bg-dark-secondary border border-dark-border rounded-xl p-4">
        <p className="text-xs text-gray-500 uppercase font-semibold mb-3">Tech Stack</p>
        <div className="flex flex-wrap gap-2">
          {stack.map((t, i) => (
            <span key={i} className={`px-2.5 py-1 rounded-full text-xs font-medium border ${t.color}`}>
              {t.name}
            </span>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 border border-blue-700/50 rounded-xl p-4 text-center">
        <p className="text-blue-300 font-semibold text-sm">Thử ngay bên trái 👈</p>
        <p className="text-gray-400 text-xs mt-1">
          Nhập: <span className="font-mono text-white bg-dark-primary px-1.5 py-0.5 rounded">Go to github.com/trending → List top 5 repos</span>
        </p>
      </div>
    </div>
  );
}

export function BrowserView({ status, currentTask, screenshots = [] }) {
  const [currentScreenshotIndex, setCurrentScreenshotIndex] = useState(0);

  // Reset to last screenshot whenever a new batch arrives
  useEffect(() => {
    if (screenshots.length > 0) {
      setCurrentScreenshotIndex(screenshots.length - 1);
    }
  }, [screenshots.length]);

  const statusConfig = {
    idle: { color: 'bg-gray-500', icon: Clock, text: 'Idle' },
    pending: { color: 'bg-blue-500', icon: Clock, text: 'Pending' },
    running: { color: 'bg-yellow-500', icon: Loader2, text: 'Running' },
    completed: { color: 'bg-green-500', icon: CheckCircle, text: 'Completed' },
    error: { color: 'bg-red-500', icon: XCircle, text: 'Error' },
  };

  const currentStatus = statusConfig[status] || statusConfig.idle;
  const StatusIcon = currentStatus.icon;

  const displayScreenshot = screenshots[currentScreenshotIndex]?.image ?? null;

  const handlePrevScreenshot = () => {
    if (currentScreenshotIndex > 0) {
      setCurrentScreenshotIndex(currentScreenshotIndex - 1);
    }
  };

  const handleNextScreenshot = () => {
    if (currentScreenshotIndex < screenshots.length - 1) {
      setCurrentScreenshotIndex(currentScreenshotIndex + 1);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-dark-border">
        <div className="flex items-center gap-2">
          <Monitor className="w-5 h-5 text-blue-500" />
          <span className="font-medium">Browser Preview</span>
        </div>
        <button className="p-2 hover:bg-dark-border rounded-lg">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Current Task Info */}
      {currentTask && (
        <div className="px-4 py-2 bg-dark-secondary border-b border-dark-border">
          <div className="flex items-center gap-2 text-sm">
            {status === 'running' && <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />}
            <span className="truncate text-gray-300">
              {currentTask.task}
            </span>
          </div>
        </div>
      )}

      {/* Screenshot Navigation (if multiple screenshots) */}
      {screenshots.length > 1 && (
        <div className="px-4 py-2 bg-dark-secondary border-b border-dark-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-gray-400">
              Step {currentScreenshotIndex + 1} / {screenshots.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevScreenshot}
              disabled={currentScreenshotIndex === 0}
              className={`p-1 rounded ${currentScreenshotIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-dark-border'}`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-500 px-2">
              {screenshots[currentScreenshotIndex]?.action || ''}
            </span>
            <button
              onClick={handleNextScreenshot}
              disabled={currentScreenshotIndex === screenshots.length - 1}
              className={`p-1 rounded ${currentScreenshotIndex === screenshots.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-dark-border'}`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 bg-dark-primary flex items-center justify-center relative">
        {displayScreenshot ? (
          <img
            src={displayScreenshot}
            alt="Browser"
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <div className="text-center text-gray-500">
            {status === 'running' ? (
              <>
                <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-blue-500" />
                <p>Browser is running...</p>
                <p className="text-sm mt-2">Please wait while the task is executing</p>
              </>
            ) : (
              <ProjectPitch />
            )}
          </div>
        )}

        {/* Screenshot Thumbnails Strip */}
        {screenshots.length > 0 && (
          <div className="absolute bottom-4 left-4 right-4 flex gap-1 overflow-x-auto py-1 px-2 bg-dark-secondary/90 rounded-lg">
            {screenshots.map((ss, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentScreenshotIndex(idx)}
                className={`flex-shrink-0 w-20 h-12 rounded border-2 overflow-hidden ${
                  idx === currentScreenshotIndex ? 'border-blue-500' : 'border-transparent hover:border-gray-500'
                }`}
              >
                <img
                  src={ss.image}
                  alt={`Step ${ss.step}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="p-3 border-t border-dark-border bg-dark-secondary">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${currentStatus.color} ${status === 'running' ? 'animate-pulse' : ''}`} />
            <StatusIcon className={`w-4 h-4 ${status === 'running' ? 'animate-spin text-yellow-500' : ''}`} />
            <span className="text-sm capitalize">{currentStatus.text}</span>
          </div>

          {status === 'running' && (
            <div className="flex items-center gap-2">
              <div className="w-32 h-1.5 bg-dark-border rounded-full overflow-hidden">
                <div className="h-full bg-yellow-500 animate-pulse" style={{ width: '60%' }} />
              </div>
              <span className="text-xs text-gray-400">Working...</span>
            </div>
          )}

          {screenshots.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Image className="w-3 h-3" />
              <span>{screenshots.length} screenshots</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}