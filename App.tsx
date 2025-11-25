
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { SubtitleEntry, PotentialError } from './types';
import { parseSrt, stringifySrt } from './services/srtParser';
import { findErrorsInSrt } from './services/geminiService';
import { getApiKey, saveApiKey, removeApiKey, hasApiKey } from './services/apiKeyStorage';
import { UploadIcon, DownloadIcon, LightbulbIcon, MoonIcon, SparklesIcon, VideoCameraIcon, XIcon } from './components/icons';
import ApiKeySetup from './components/ApiKeySetup';

type AppStatus = 'idle' | 'analyzing' | 'ready' | 'error';

const srtTimeToSeconds = (time: string): number => {
    const parts = time.split(/[:,]/);
    if (parts.length !== 4) return 0;
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parseInt(parts[2], 10);
    const milliseconds = parseInt(parts[3], 10);
    return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
};

const App: React.FC = () => {
  const [apiKeyConfigured, setApiKeyConfigured] = useState<boolean>(hasApiKey());
  const [subtitles, setSubtitles] = useState<SubtitleEntry[]>([]);
  const [srtContent, setSrtContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoFileName, setVideoFileName] = useState<string>('');
  const [potentialErrors, setPotentialErrors] = useState<PotentialError[]>([]);
  const [selectedError, setSelectedError] = useState<PotentialError | null>(null);
  const [editingSubtitleId, setEditingSubtitleId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const [status, setStatus] = useState<AppStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isVideoVisible, setIsVideoVisible] = useState(true);
  const [showSettings, setShowSettings] = useState(false);


  const srtInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const videoWindowRef = useRef<Window | null>(null);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);
  
  useEffect(() => {
    // Cleanup object URL on component unmount or when videoUrl changes
    return () => {
        if (videoUrl) {
            URL.revokeObjectURL(videoUrl);
        }
    };
  }, [videoUrl]);

  useEffect(() => {
    // Listen for messages from video window
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'VIDEO_CLOSED') {
        videoWindowRef.current = null;
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Handles setting the text for the editor when an error is selected or direct editing
  useEffect(() => {
    if (selectedError) {
      const subtitleToEdit = subtitles.find(sub => sub.id === selectedError.subtitleId);
      if (subtitleToEdit) {
        setEditingText(subtitleToEdit.text);
        setEditingSubtitleId(subtitleToEdit.id);
      }
    } else if (editingSubtitleId !== null) {
      const subtitleToEdit = subtitles.find(sub => sub.id === editingSubtitleId);
      if (subtitleToEdit) {
        setEditingText(subtitleToEdit.text);
      }
    } else {
      setEditingText('');
    }
  }, [selectedError, editingSubtitleId, subtitles]);

  // Ensures video player becomes visible when an error is selected or direct editing
  useEffect(() => {
    if ((selectedError || editingSubtitleId !== null) && videoUrl) {
      setIsVideoVisible(true);
    }
  }, [selectedError, editingSubtitleId, videoUrl]);

  // Scrolls to subtitle and opens video in new window when an error is selected or direct editing
  useEffect(() => {
    const activeSubtitleId = selectedError?.subtitleId ?? editingSubtitleId;

    if (activeSubtitleId !== null && videoUrl) {
      // Scroll subtitle into view
      previewRefs.current[activeSubtitleId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });

      // Open video in new window with the subtitle time
      const subtitle = subtitles.find(sub => sub.id === activeSubtitleId);
      if (subtitle) {
        const seekTime = srtTimeToSeconds(subtitle.startTime);
        handleOpenVideoInNewWindow(seekTime);
      }
    }
  }, [selectedError, editingSubtitleId, videoUrl, subtitles]);


  const handleSrtUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setSubtitles([]);
    setPotentialErrors([]);
    setSelectedError(null);
    setErrorMessage('');

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const parsedSubtitles = parseSrt(content);
      if(parsedSubtitles.length > 0){
          setSrtContent(content);
          setSubtitles(parsedSubtitles);
      } else {
          setErrorMessage("Could not parse any subtitles from the file.");
          setSrtContent('');
          setSubtitles([]);
      }
    };
    reader.onerror = () => {
        setErrorMessage("Failed to read the SRT file.");
    };
    reader.readAsText(file);
  };
  
  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      
      setVideoFileName(file.name);
      if (videoUrl) {
          URL.revokeObjectURL(videoUrl);
      }
      setVideoUrl(URL.createObjectURL(file));
      setIsVideoVisible(true);
  };
  
  const handleHideVideo = () => {
    setIsVideoVisible(false);
    if (videoRef.current) {
      videoRef.current.pause();
    }
  };

  const handleOpenVideoInNewWindow = (seekToTime?: number) => {
    if (!videoUrl) return;

    // Check if window is already open and valid
    if (videoWindowRef.current && !videoWindowRef.current.closed) {
      // Update existing window
      try {
        videoWindowRef.current.postMessage({
          type: 'SEEK_VIDEO',
          time: seekToTime ?? 0,
          subtitles: subtitles
        }, '*');
        videoWindowRef.current.focus();
        return;
      } catch (e) {
        console.error('Failed to communicate with video window:', e);
        videoWindowRef.current = null;
      }
    }

    // Create new window
    const newWindow = window.open('', '_blank', 'width=800,height=600,resizable=yes');
    if (!newWindow) {
      alert('팝업이 차단되었습니다. 팝업 차단을 해제해주세요.');
      return;
    }

    videoWindowRef.current = newWindow;

    const currentTime = seekToTime ?? videoRef.current?.currentTime ?? 0;
    const subtitlesJson = JSON.stringify(subtitles);

    newWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Video Player - ${videoFileName}</title>
          <meta charset="UTF-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              background: rgba(0, 0, 0, 0.8);
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              font-family: system-ui, -apple-system, sans-serif;
              overflow: hidden;
            }
            .draggable-container {
              position: fixed;
              width: 800px;
              height: 500px;
              background: #000;
              border: 2px solid #4f46e5;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8);
              display: flex;
              flex-direction: column;
            }
            .title-bar {
              background: #1e293b;
              color: #cbd5e1;
              padding: 8px 16px;
              font-size: 14px;
              cursor: move;
              user-select: none;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .video-wrapper {
              flex: 1;
              position: relative;
              background: #000;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            video {
              width: 100%;
              height: 100%;
              object-fit: contain;
            }
            .subtitle-overlay {
              position: absolute;
              bottom: 60px;
              left: 50%;
              transform: translateX(-50%);
              background: rgba(0, 0, 0, 0.75);
              color: #fff;
              padding: 8px 16px;
              border-radius: 4px;
              font-size: 18px;
              font-weight: 500;
              text-align: center;
              max-width: 80%;
              white-space: pre-wrap;
              line-height: 1.4;
              pointer-events: none;
              display: none;
            }
          </style>
        </head>
        <body>
          <div class="draggable-container" id="container">
            <div class="title-bar" id="titleBar">
              <span>${videoFileName}</span>
              <span style="font-size: 12px; color: #94a3b8;">드래그하여 이동</span>
            </div>
            <div class="video-wrapper">
              <video id="video" controls autoplay>
                <source src="${videoUrl}" type="video/mp4">
              </video>
              <div class="subtitle-overlay" id="subtitle"></div>
            </div>
          </div>
          <script>
            const video = document.getElementById('video');
            const subtitle = document.getElementById('subtitle');
            const container = document.getElementById('container');
            const titleBar = document.getElementById('titleBar');
            let subtitles = ${subtitlesJson};

            video.currentTime = ${currentTime};

            // Listen for messages from parent window
            window.addEventListener('message', (event) => {
              if (event.data.type === 'SEEK_VIDEO') {
                video.currentTime = event.data.time;
                if (event.data.subtitles) {
                  subtitles = event.data.subtitles;
                }
                video.play().catch(e => console.error("Autoplay prevented:", e));
              }
            });

            // Subtitle display logic
            function srtTimeToSeconds(time) {
              const parts = time.split(/[:,]/);
              if (parts.length !== 4) return 0;
              const hours = parseInt(parts[0], 10);
              const minutes = parseInt(parts[1], 10);
              const seconds = parseInt(parts[2], 10);
              const milliseconds = parseInt(parts[3], 10);
              return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
            }

            video.addEventListener('timeupdate', () => {
              const currentTime = video.currentTime;
              const currentSubtitle = subtitles.find(sub => {
                const start = srtTimeToSeconds(sub.startTime);
                const end = srtTimeToSeconds(sub.endTime);
                return currentTime >= start && currentTime <= end;
              });

              if (currentSubtitle) {
                subtitle.textContent = currentSubtitle.text;
                subtitle.style.display = 'block';
              } else {
                subtitle.style.display = 'none';
              }
            });

            // Dragging logic
            let isDragging = false;
            let currentX;
            let currentY;
            let initialX;
            let initialY;
            let xOffset = (window.innerWidth - 800) / 2;
            let yOffset = (window.innerHeight - 500) / 2;

            container.style.left = xOffset + 'px';
            container.style.top = yOffset + 'px';

            titleBar.addEventListener('mousedown', dragStart);
            document.addEventListener('mousemove', drag);
            document.addEventListener('mouseup', dragEnd);

            function dragStart(e) {
              initialX = e.clientX - xOffset;
              initialY = e.clientY - yOffset;
              isDragging = true;
            }

            function drag(e) {
              if (isDragging) {
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;
                xOffset = currentX;
                yOffset = currentY;
                setTranslate(currentX, currentY, container);
              }
            }

            function dragEnd(e) {
              initialX = currentX;
              initialY = currentY;
              isDragging = false;
            }

            function setTranslate(xPos, yPos, el) {
              el.style.left = xPos + 'px';
              el.style.top = yPos + 'px';
            }

            window.addEventListener('beforeunload', () => {
              if (window.opener && !window.opener.closed) {
                try {
                  window.opener.postMessage({ type: 'VIDEO_CLOSED' }, '*');
                } catch (e) {}
              }
            });
          </script>
        </body>
      </html>
    `);
    newWindow.document.close();
  };

  const handleApiKeySubmit = (apiKey: string) => {
    saveApiKey(apiKey);
    setApiKeyConfigured(true);
  };

  const handleApiKeyReset = () => {
    if (confirm('정말로 API 키를 삭제하시겠습니까? 다시 입력해야 합니다.')) {
      removeApiKey();
      setApiKeyConfigured(false);
      setShowSettings(false);
      // Reset app state
      setSubtitles([]);
      setSrtContent('');
      setFileName('');
      setPotentialErrors([]);
      setSelectedError(null);
      setStatus('idle');
    }
  };

  const handleStartAnalysis = async () => {
      if (!srtContent) {
          alert("Please upload an SRT file first.");
          return;
      }

      const apiKey = getApiKey();
      if (!apiKey) {
          alert("API 키가 설정되지 않았습니다.");
          setApiKeyConfigured(false);
          return;
      }

      setStatus('analyzing');
      try {
        const errors = await findErrorsInSrt(srtContent, apiKey);
        setPotentialErrors(errors);
        setStatus('ready');
        if (errors.length === 0) {
            alert("No errors found in the subtitle file.");
        }
      } catch (error) {
        const err = error as Error;
        setErrorMessage(err.message);
        setStatus('error');
      }
  };
  
  const handleSubtitleClick = (subtitleId: number) => {
    // If already editing this subtitle, do nothing
    if (editingSubtitleId === subtitleId || selectedError?.subtitleId === subtitleId) {
      return;
    }

    // Check if there's an error for this subtitle
    const errorForSubtitle = potentialErrors.find(err => err.subtitleId === subtitleId);

    if (errorForSubtitle) {
      // If there's an error, select it (existing behavior)
      setSelectedError(errorForSubtitle);
      setEditingSubtitleId(null);
    } else {
      // Otherwise, enter direct edit mode
      setEditingSubtitleId(subtitleId);
      setSelectedError(null);
    }
  };

  const handleSaveEdit = useCallback(() => {
    const subtitleIdToEdit = selectedError?.subtitleId ?? editingSubtitleId;
    if (subtitleIdToEdit === null) return;

    setSubtitles(prev =>
      prev.map(sub =>
        sub.id === subtitleIdToEdit
          ? { ...sub, text: editingText }
          : sub
      )
    );

    // If editing from error, remove the error
    if (selectedError) {
      setPotentialErrors(prev => prev.filter(err => err.id !== selectedError.id));
      setSelectedError(null);
    }

    setEditingSubtitleId(null);
  }, [selectedError, editingSubtitleId, editingText]);

  const handleCancelEdit = useCallback(() => {
    setSelectedError(null);
    setEditingSubtitleId(null);
  }, []);

  const handleIgnoreError = useCallback(() => {
    if (!selectedError) return;
    setPotentialErrors(prev => prev.filter(err => err.id !== selectedError.id));
    setSelectedError(null);
    setEditingSubtitleId(null);
  }, [selectedError]);

  const applySuggestionInEditor = useCallback((suggestion: string) => {
    if (!selectedError) return;
    setEditingText(currentText => currentText.replace(new RegExp(selectedError.originalWord, 'i'), suggestion));
  }, [selectedError]);

  const handleDownload = () => {
    const correctedSrt = stringifySrt(subtitles);
    const blob = new Blob([correctedSrt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `corrected_${fileName || 'subtitles.srt'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // Show API key setup if not configured
  if (!apiKeyConfigured) {
    return <ApiKeySetup onApiKeySubmit={handleApiKeySubmit} isDarkMode={isDarkMode} onToggleDarkMode={() => setIsDarkMode(!isDarkMode)} />;
  }

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
          <div className="flex items-center gap-4">
             {subtitles.length > 0 && status === 'ready' && (
                <button onClick={handleDownload} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-transform transform hover:scale-105 shadow">
                    <DownloadIcon className="w-5 h-5" />
                    Download
                </button>
            )}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title="설정"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title="다크 모드"
            >
              {isDarkMode ? <LightbulbIcon className="w-6 h-6" /> : <MoonIcon className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowSettings(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full p-6" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">설정</h2>
              <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <XIcon className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                <h3 className="font-semibold mb-2 text-slate-900 dark:text-white">API 키 관리</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                  현재 API 키가 설정되어 있습니다. 새로운 키로 변경하려면 아래 버튼을 클릭하세요.
                </p>
                <button
                  onClick={handleApiKeyReset}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  API 키 삭제 및 재설정
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        {status === 'idle' && (
          <div className="flex flex-col items-center justify-center h-[70vh]">
            <div className="w-full max-w-2xl space-y-6">
                <div 
                    className="relative w-full p-8 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all"
                    onClick={() => srtInputRef.current?.click()}
                >
                  <input type="file" ref={srtInputRef} onChange={handleSrtUpload} accept=".srt" className="hidden" />
                  <div className="flex flex-col items-center justify-center space-y-4 text-slate-500 dark:text-slate-400">
                    <UploadIcon className="w-12 h-12" />
                    <p className="text-lg font-semibold">{fileName ? `Loaded: ${fileName}` : 'Click to upload SRT Subtitle File'}</p>
                    <p className="text-sm">This is required to start analysis.</p>
                  </div>
                </div>
                <div 
                    className="relative w-full p-8 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all"
                    onClick={() => videoInputRef.current?.click()}
                >
                  <input type="file" ref={videoInputRef} onChange={handleVideoUpload} accept="video/mp4" className="hidden" />
                  <div className="flex flex-col items-center justify-center space-y-4 text-slate-500 dark:text-slate-400">
                    <VideoCameraIcon className="w-12 h-12" />
                    <p className="text-lg font-semibold">{videoFileName ? `Loaded: ${videoFileName}` : 'Click to upload MP4 Video'}</p>
                    <p className="text-sm">Optional, for synchronized playback.</p>
                  </div>
                </div>
            </div>
            <button 
                onClick={handleStartAnalysis}
                disabled={!srtContent}
                className="mt-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-12 rounded-lg text-lg transition-all transform hover:scale-105 disabled:bg-slate-400 disabled:cursor-not-allowed disabled:scale-100 dark:disabled:bg-slate-600"
            >
                Start Analysis
            </button>
            {errorMessage && <p className="mt-4 text-red-500">{errorMessage}</p>}
          </div>
        )}

        {status === 'analyzing' && (
          <div className="text-center flex flex-col items-center justify-center h-[60vh]">
            <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-indigo-500"></div>
            <p className="mt-4 text-xl font-semibold tracking-wider">
              Analyzing with AI...
            </p>
            <p className="text-slate-500 dark:text-slate-400">{fileName}</p>
          </div>
        )}
        
        {status === 'error' && (
            <div className="text-center flex flex-col items-center justify-center h-[60vh]">
                <div className="bg-red-100 dark:bg-red-900/50 border border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg relative max-w-md" role="alert">
                    <strong className="font-bold">Error! </strong>
                    <span className="block sm:inline">{errorMessage}</span>
                    <button onClick={() => setStatus('idle')} className="mt-4 w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded">Try again</button>
                </div>
            </div>
        )}

        {status === 'ready' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-lg sticky top-24">
                <h2 className="text-lg font-bold mb-2">Potential Errors ({potentialErrors.length})</h2>
                 {potentialErrors.length > 0 ? (
                    <div className="max-h-[65vh] overflow-y-auto pr-2 space-y-2">
                      {potentialErrors.map(error => (
                        <div key={error.id} onClick={() => setSelectedError(error)} className={`p-3 rounded-md cursor-pointer transition-colors ${selectedError?.id === error.id ? 'bg-indigo-100 dark:bg-indigo-900/50' : 'hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}>
                          <p className="font-semibold text-red-500 dark:text-red-400">"{error.originalWord}"</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{error.context}</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500">Reason: {error.reason}</p>
                        </div>
                      ))}
                    </div>
                 ) : (
                    <div className="text-center py-10">
                        <p className="font-semibold text-green-600 dark:text-green-400">All errors corrected or none found!</p>
                        <p className="text-sm text-slate-500 mt-2">You can now download the file.</p>
                    </div>
                 )}
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-lg max-h-[85vh] overflow-y-auto">
                    <h2 className="text-lg font-bold mb-2 sticky top-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur py-2">Preview: {fileName}</h2>
                    <div className="space-y-4 font-mono text-sm">
                        {subtitles.map(sub => {
                            const isEditing = selectedError?.subtitleId === sub.id || editingSubtitleId === sub.id;
                            const hasError = potentialErrors.some((err: PotentialError) => err.subtitleId === sub.id);

                            return isEditing ? (
                              <div key={sub.id} ref={el => { previewRefs.current[sub.id] = el; }} className="bg-indigo-50 dark:bg-indigo-900/40 p-4 rounded-lg ring-2 ring-indigo-500 transition-all duration-300">
                                  <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">{sub.id} | {sub.startTime} --&gt; {sub.endTime}</p>
                                  <textarea
                                    value={editingText}
                                    onChange={(e) => setEditingText(e.target.value)}
                                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-900 font-mono text-base whitespace-pre-wrap focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                                    rows={editingText.split('\n').length + 1}
                                    autoFocus
                                  />
                                  {selectedError && selectedError.suggestions.length > 0 && (
                                    <div className="my-3">
                                      <h3 className="text-sm font-semibold mb-1 text-slate-700 dark:text-slate-300">Suggestions:</h3>
                                      <div className="flex flex-wrap gap-2">
                                        {selectedError.suggestions.map((s, i) => (
                                          <button key={i} onClick={() => applySuggestionInEditor(s)} className="bg-slate-200 dark:bg-slate-700 hover:bg-indigo-200 dark:hover:bg-indigo-600 text-sm py-1 px-3 rounded-full transition-colors">{s}</button>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  <div className="flex flex-col sm:flex-row gap-2 mt-4">
                                    <button onClick={handleSaveEdit} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md transition-colors">Save</button>
                                    {selectedError && (
                                      <button onClick={handleIgnoreError} className="flex-1 bg-slate-500 hover:bg-slate-600 text-white font-semibold py-2 px-4 rounded-md transition-colors">Ignore</button>
                                    )}
                                    <button onClick={handleCancelEdit} className="flex-1 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-md transition-colors">Cancel</button>
                                  </div>
                              </div>
                            ) : (
                              <div
                                key={sub.id}
                                ref={(el: HTMLDivElement | null) => { previewRefs.current[sub.id] = el; }}
                                onClick={() => handleSubtitleClick(sub.id)}
                                className={`p-3 rounded-md transition-all duration-300 cursor-pointer ${
                                  hasError
                                    ? 'bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 hover:bg-red-100 dark:hover:bg-red-900/30'
                                    : 'bg-slate-50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:ring-2 hover:ring-indigo-300 dark:hover:ring-indigo-700'
                                }`}
                                title="클릭하여 수정"
                              >
                                  <p className="text-xs text-slate-400">{sub.id} | {sub.startTime} --&gt; {sub.endTime}</p>
                                  <p className="text-base whitespace-pre-wrap text-slate-800 dark:text-slate-100">
                                    {sub.text}
                                  </p>
                                  {hasError && (
                                    <span className="inline-block mt-2 text-xs bg-red-500 text-white px-2 py-1 rounded-full">오류 발견됨</span>
                                  )}
                              </div>
                            );
                        })}
                    </div>
                </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;