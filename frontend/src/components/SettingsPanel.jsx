import React from 'react';
import { Globe, Brain } from 'lucide-react';

export function SettingsPanel({ settings, onSave }) {
  const [activeTab, setActiveTab] = React.useState('browser');
  const [formData, setFormData] = React.useState(settings);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex border-b border-dark-border">
        <button
          onClick={() => setActiveTab('browser')}
          className={`flex items-center gap-2 px-4 py-3 ${
            activeTab === 'browser'
              ? 'border-b-2 border-blue-500 text-blue-500'
              : 'text-gray-400'
          }`}
        >
          <Globe className="w-4 h-4" />
          Browser
        </button>
        <button
          onClick={() => setActiveTab('agent')}
          className={`flex items-center gap-2 px-4 py-3 ${
            activeTab === 'agent'
              ? 'border-b-2 border-blue-500 text-blue-500'
              : 'text-gray-400'
          }`}
        >
          <Brain className="w-4 h-4" />
          Agent
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 p-4 overflow-y-auto">
        {activeTab === 'browser' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Browser Type</label>
              <select
                value={formData.browserType}
                onChange={(e) => setFormData({...formData, browserType: e.target.value})}
                className="w-full bg-dark-primary border border-dark-border rounded-lg px-3 py-2"
              >
                <option value="chromium">Chromium (Chrome)</option>
                <option value="firefox">Firefox</option>
                <option value="webkit">WebKit (Safari)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="headless"
                checked={formData.headless}
                onChange={(e) => setFormData({...formData, headless: e.target.checked})}
                className="w-4 h-4"
              />
              <label htmlFor="headless" className="text-sm">Headless Mode</label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="stealth"
                checked={formData.stealth}
                onChange={(e) => setFormData({...formData, stealth: e.target.checked})}
                className="w-4 h-4"
              />
              <label htmlFor="stealth" className="text-sm">Stealth Mode</label>
            </div>
          </div>
        )}

        {activeTab === 'agent' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">LLM Provider</label>
              <select
                value={formData.llmProvider}
                onChange={(e) => setFormData({...formData, llmProvider: e.target.value})}
                className="w-full bg-dark-primary border border-dark-border rounded-lg px-3 py-2"
              >
                <option value="minimax">VNG Cloud MaaS (đang dùng)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Chỉ các model VNG Cloud MaaS được activate trên account hiện tại.</p>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Model</label>
              <select
                value={formData.llmModel || 'auto'}
                onChange={(e) => setFormData({...formData, llmModel: e.target.value})}
                className="w-full bg-dark-primary border border-dark-border rounded-lg px-3 py-2"
              >
                <option value="auto">Auto → minimax/minimax-m2.5</option>
                <option value="minimax/minimax-m2.5">minimax/minimax-m2.5</option>
                <option value="google/gemma-4-31b-it">google/gemma-4-31b-it (chậm, ~60s/bước)</option>
                <option value="deepseek/deepseek-v4-flash">deepseek/deepseek-v4-flash (rate limited)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Vision đang tắt — agent đọc DOM, không chụp màn hình.</p>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Max Iterations</label>
              <input
                type="number"
                value={formData.maxIterations}
                onChange={(e) => setFormData({...formData, maxIterations: parseInt(e.target.value)})}
                className="w-full bg-dark-primary border border-dark-border rounded-lg px-3 py-2"
                min="1"
                max="100"
              />
            </div>

          </div>
        )}

        <button
          type="submit"
          className="w-full mt-4 bg-blue-600 hover:bg-blue-700 py-2 rounded-lg font-medium"
        >
          Save Settings
        </button>
      </form>
    </div>
  );
}
