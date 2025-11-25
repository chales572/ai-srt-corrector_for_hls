import React, { useState } from 'react';
import { SparklesIcon, LightbulbIcon, MoonIcon } from './icons';

interface ApiKeySetupProps {
  onApiKeySubmit: (apiKey: string) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

const ApiKeySetup: React.FC<ApiKeySetupProps> = ({ onApiKeySubmit, isDarkMode, onToggleDarkMode }) => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      onApiKeySubmit(apiKey.trim());
    }
  };

  return (
    <div className="min-h-screen text-slate-800 dark:text-slate-200 transition-colors duration-300">
      <header className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg sticky top-0 z-10 shadow-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <SparklesIcon className="w-8 h-8 text-indigo-500" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              AI SRT Corrector
            </h1>
          </div>
          <button
            onClick={onToggleDarkMode}
            className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            {isDarkMode ? <LightbulbIcon className="w-6 h-6" /> : <MoonIcon className="w-6 h-6" />}
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-3xl mx-auto">
          {/* Welcome Section */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-full mb-4">
              <SparklesIcon className="w-12 h-12 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h2 className="text-3xl font-bold mb-3 text-slate-900 dark:text-white">
              AI 자막 교정 도우미에 오신 것을 환영합니다!
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              시작하기 전에 Google Gemini API 키가 필요합니다
            </p>
          </div>

          {/* Info Cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg border border-slate-200 dark:border-slate-700">
              <div className="flex items-start gap-3 mb-3">
                <span className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">1</span>
                <div>
                  <h3 className="font-bold text-lg mb-2 text-slate-900 dark:text-white">API 키 발급받기</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                    Google AI Studio에서 무료로 API 키를 발급받을 수 있습니다.
                  </p>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    API 키 발급 페이지로 이동
                  </a>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg border border-slate-200 dark:border-slate-700">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400 font-bold">2</span>
                <div>
                  <h3 className="font-bold text-lg mb-2 text-slate-900 dark:text-white">API 키 입력하기</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    발급받은 API 키를 아래 입력란에 붙여넣으세요. 키는 안전하게 브라우저에만 저장됩니다.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* API Key Input Form */}
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-slate-800 dark:to-slate-900 rounded-xl p-8 shadow-xl border border-indigo-100 dark:border-slate-700">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="apiKey" className="block text-sm font-semibold mb-2 text-slate-900 dark:text-white">
                  Google Gemini API 키
                </label>
                <div className="relative">
                  <input
                    id="apiKey"
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="AIza..."
                    className="w-full px-4 py-3 pr-12 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 transition-all outline-none text-slate-900 dark:text-white"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    title={showKey ? "숨기기" : "보기"}
                  >
                    {showKey ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  * API 키는 브라우저의 로컬 스토리지에만 저장되며, 외부로 전송되지 않습니다.
                </p>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg text-lg transition-all transform hover:scale-[1.02] shadow-lg disabled:bg-slate-400 disabled:cursor-not-allowed disabled:scale-100"
                disabled={!apiKey.trim()}
              >
                시작하기
              </button>
            </form>
          </div>

          {/* Help Section */}
          <div className="mt-8 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900 rounded-lg p-6">
            <h4 className="font-bold text-amber-900 dark:text-amber-400 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              도움말
            </h4>
            <div className="space-y-2 text-sm text-amber-900 dark:text-amber-300">
              <p><strong>Q: API 키는 무료인가요?</strong></p>
              <p className="ml-4 mb-3">A: 네! Google Gemini API는 무료 할당량을 제공합니다. 일반적인 사용에는 충분합니다.</p>

              <p><strong>Q: API 키가 안전한가요?</strong></p>
              <p className="ml-4 mb-3">A: API 키는 여러분의 브라우저에만 저장되며, 서버로 전송되지 않습니다. 언제든지 삭제할 수 있습니다.</p>

              <p><strong>Q: Google 계정이 필요한가요?</strong></p>
              <p className="ml-4">A: 네, Google AI Studio에서 API 키를 발급받으려면 Google 계정으로 로그인해야 합니다.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ApiKeySetup;
