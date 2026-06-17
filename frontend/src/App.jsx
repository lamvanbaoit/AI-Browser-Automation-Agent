import { useState, useEffect, useCallback } from 'react';
import { Bot, Globe, FlaskConical, Webhook } from 'lucide-react';
import { ChatBox } from './components/ChatBox';
import { useWebSocket } from './hooks/useWebSocket';

const API_BASE = '/api/v1';

function App() {
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('idle');
  const settings = {
    browserType: 'chromium',
    headless: false,
    stealth: true,
    llmProvider: 'minimax',
    llmModel: 'auto',
    maxIterations: 5,
  };

  const { connected, lastMessage } = useWebSocket();

  const applyTaskDetail = useCallback((taskDetail) => {
    if (!taskDetail || !taskDetail.task_id) return;
    const tid = taskDetail.task_id;

    if (taskDetail.status === 'completed') setStatus('completed');
    else if (taskDetail.status === 'error') setStatus('error');
    else if (taskDetail.status === 'running') setStatus('running');

    setMessages(currentMessages => {
      const currentKey = `task-${tid}`;
      const doneKey = `done-${tid}`;
      const errorKey = `error-${tid}`;

      // Already finalized -> don't touch it again
      if (currentMessages.some(m => m.id === doneKey || m.id === errorKey)) {
        return currentMessages;
      }

      // Error
      if (taskDetail.status === 'error' && taskDetail.error) {
        const newContent = `❌ Task Failed!\n\nError: ${taskDetail.error}\n\n📋 Steps:\n${(taskDetail.steps || []).join('\n')}`;
        const existingIdx = currentMessages.findIndex(m => m.id === currentKey);
        if (existingIdx >= 0) {
          const updated = [...currentMessages];
          updated[existingIdx] = { ...updated[existingIdx], content: newContent, id: errorKey };
          return updated;
        }
        return [...currentMessages, { sender: 'bot', content: newContent, id: errorKey, timestamp: new Date().toISOString() }];
      }

      // Completed
      if (taskDetail.status === 'completed') {
        const stepDetails = taskDetail.step_details || [];
        const screenshots = taskDetail.screenshots || [];
        const duration = taskDetail.duration ? `${taskDetail.duration}s` : '';
        const stepCount = stepDetails.length || taskDetail.steps?.length || 0;

        // Detect unreadable Python object dumps from browser-use
        const rawResult = taskDetail.result || '';
        const looksLikeObjectDump = rawResult.startsWith('AgentHistory') ||
          rawResult.startsWith('[ActionResult') ||
          rawResult.includes('all_results=[') ||
          rawResult.includes('model_output=');

        let resultText;
        if (!rawResult) {
          // Task succeeded but agent returned nothing — infer from last step
          const lastEval = stepDetails.at(-1)?.evaluation;
          resultText = lastEval
            ? `(Agent finished without explicit output)\n\nLast step: ${lastEval}`
            : '(Agent completed the task but returned no output)';
        } else if (looksLikeObjectDump) {
          // Raw internal object leaked — show warning + truncated dump
          resultText = `⚠️ Agent returned raw internal data (parsing failed).\n\nRaw (truncated):\n${rawResult.slice(0, 300)}...`;
        } else {
          resultText = rawResult;
        }

        const warnings = [];
        if (stepCount === 0) warnings.push('⚠️ No steps were recorded');

        const header = `✅ Task Completed! (${stepCount} steps${duration ? ', ' + duration : ''})`;
        const newContent = [
          header,
          warnings.length ? warnings.join('\n') : null,
          `\n📊 Result:\n${resultText}`,
        ].filter(Boolean).join('\n');

        // Remove any stale bubbles (task-id or running versions) and replace with final done bubble
        const filtered = currentMessages.filter(m => m.id !== currentKey && m.id !== doneKey && m.id !== errorKey);
        return [...filtered, { sender: 'bot', content: newContent, id: doneKey, stepDetails, screenshots, timestamp: new Date().toISOString() }];
      }

      // Running (live progress) — update the same bubble created on send,
      // so it transitions 🚀 → 🔄 → ✅ instead of leaving a stale bubble.
      if (taskDetail.status === 'running' && taskDetail.steps?.length > 0) {
        const newContent = `🔄 Running...\n\n📋 Progress:\n${taskDetail.steps.slice(-3).join('\n')}`;
        const existingIdx = currentMessages.findIndex(m => m.id === currentKey);
        if (existingIdx >= 0) {
          const updated = [...currentMessages];
          updated[existingIdx] = { ...updated[existingIdx], content: newContent };
          return updated;
        }
        return [...currentMessages, { sender: 'bot', content: newContent, id: currentKey, timestamp: new Date().toISOString() }];
      }

      return currentMessages;
    });
  }, []);

  // Apply each task snapshot as it arrives (realtime path)
  useEffect(() => {
    if (lastMessage?.type === 'task_update' && lastMessage.task) {
      applyTaskDetail(lastMessage.task);
    }
  }, [lastMessage, applyTaskDetail]);

  const handleSendTask = async (task, timestamp) => {
    const trimmed = task.trim();

    if (!trimmed || trimmed.length < 2) {
      setMessages(prev => [...prev, {
        sender: 'bot',
        content: `⚠️ Input quá ngắn. Vui lòng nhập mô tả rõ ràng hơn.\n\n💡 Ví dụ hợp lệ:\n• "Go to google.com"\n• "Search youtube for cat videos"\n• "Open github.com and check trending repos"`,
        id: `help-${Date.now()}`,
        timestamp: new Date().toISOString()
      }]);
      return;
    }

    if (trimmed.length < 5 && !trimmed.match(/[a-zA-Z]{3,}/)) {
      setMessages(prev => [...prev, {
        sender: 'bot',
        content: `⚠️ Input không rõ ràng: "${trimmed}"\n\nVui lòng nhập task cụ thể hơn.\n\n💡 Ví dụ:\n• "hi" → "Go to google.com and say hi"\n• "tìm gì đó" → "Search google for AI news"`,
        id: `help-${Date.now()}`,
        timestamp: new Date().toISOString()
      }]);
      return;
    }

    setMessages(prev => [...prev, {
      sender: 'user',
      content: task,
      id: timestamp || Date.now().toString(),
      timestamp: timestamp || new Date().toISOString()
    }]);
    setStatus('running');

    try {
      const res = await fetch(`${API_BASE}/task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, ...settings }),
      });
      const data = await res.json();

      const modelDisplay = (!settings.llmModel || settings.llmModel.toLowerCase() === 'auto')
        ? 'MiniMax M2.5 (auto)'
        : settings.llmModel;
      setMessages(prev => [...prev, {
        sender: 'bot',
        content: `🚀 Task đang chạy...\n\n📝 ${task}\n⚙️ Model: ${modelDisplay}\n⏳ Đang xử lý...`,
        id: `task-${data.task_id}`,
        timestamp: new Date().toISOString()
      }]);
      setStatus('running');
    } catch (err) {
      setMessages(prev => [...prev, {
        sender: 'bot',
        content: `❌ Error: ${err.message}`,
        id: `error-${Date.now()}`,
        timestamp: new Date().toISOString()
      }]);
      setStatus('error');
    }
  };



  const QA_URL = 'https://endpoint-9e403801-44eb-4baa-94f6-4d1446fb3b40.agentbase-runtime.aiplatform.vngcloud.vn/';
  const API_AGENT_URL = 'https://endpoint-47cbe90a-21d9-4a3b-b190-9bae1bdca3a2.agentbase-runtime.aiplatform.vngcloud.vn/';

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <div className="w-16 bg-slate-50 border-r border-slate-200 flex flex-col items-center py-4 gap-1">
        {/* Logo */}
        <div className="relative mb-3">
          <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <span
            title={connected ? 'Realtime connected' : 'Realtime disconnected'}
            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-50 ${connected ? 'bg-green-500' : 'bg-slate-400'}`}
          />
        </div>

        {/* Browser Agent */}
        <div className="flex flex-col items-center gap-1 w-full px-1">
          <button
            title="Browser Agent"
            className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm"
          >
            <Globe className="w-[18px] h-[18px]" />
          </button>
          <span className="text-[9px] font-medium text-blue-600 text-center leading-tight">Browser Agent</span>
        </div>

        {/* QA Agent */}
        <div className="flex flex-col items-center gap-1 w-full px-1">
          <button
            onClick={() => window.open(QA_URL, '_blank')}
            title="QA Requirements Analyzer — mở tab mới"
            className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-sm hover:bg-purple-700 transition-colors"
          >
            <FlaskConical className="w-[18px] h-[18px]" />
          </button>
          <span className="text-[9px] font-medium text-purple-600 text-center leading-tight">QE Agent</span>
        </div>

        {/* API Agent */}
        <div className="flex flex-col items-center gap-1 w-full px-1">
          <button
            onClick={() => window.open(API_AGENT_URL, '_blank')}
            title="API Agent — mở tab mới"
            className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-sm hover:bg-teal-700 transition-colors"
          >
            <Webhook className="w-[18px] h-[18px]" />
          </button>
          <span className="text-[9px] font-medium text-teal-600 text-center leading-tight">Idempotency Agent</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 h-full overflow-hidden">
        <ChatBox messages={messages} onSend={handleSendTask} status={status} />
      </div>
    </div>
  );
}

export default App;
