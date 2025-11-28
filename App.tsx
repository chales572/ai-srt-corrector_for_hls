import React, { useState, useCallback, useEffect, useRef } from 'react';
import { SubtitleEntry, PotentialError } from './types';
import { parseSrt, stringifySrt } from './services/srtParser';
import { findErrorsInSrt } from './services/geminiService';
import { getApiKey, saveApiKey, removeApiKey, hasApiKey } from './services/apiKeyStorage';
import { UploadIcon, DownloadIcon, LightbulbIcon, MoonIcon, SparklesIcon, VideoCameraIcon, XIcon } from './components/icons';
import ApiKeySetup from './components/ApiKeySetup';
import Hls from 'hls.js';
import * as XLSX from 'xlsx';

type AppStatus = 'idle' | 'loading' | 'analyzing' | 'ready' | 'error';
type AppView = 'upload' | 'list' | 'editor';

interface ExcelVideoEntry {
  FILE_PATH: string;
  FILE_NAME: string;
  FILE_TY_CD: string;
  fullUrl: string;
}

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
  const [videoList, setVideoList] = useState<ExcelVideoEntry[]>([]);
  const [currentView, setCurrentView] = useState<AppView>('upload');
  const [apiKeyConfigured, setApiKeyConfigured] = useState<boolean>(hasApiKey());
  const [subtitles, setSubtitles] = useState<SubtitleEntry[]>([]);
  const [srtContent, setSrtContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoFileName, setVideoFileName] = useState<string>('');
  const [hlsUrlInput, setHlsUrlInput] = useState<string>('');
  const [potentialErrors, setPotentialErrors] = useState<PotentialError[]>([]);
  const [selectedError, setSelectedError] = useState<PotentialError | null>(null);
  const [editingSubtitleId, setEditingSubtitleId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const [status, setStatus] = useState<AppStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isVideoVisible, setIsVideoVisible] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);


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
      if (videoUrl && !videoUrl.startsWith('http')) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  useEffect(() => {
    if (videoUrl && videoUrl.endsWith('.m3u8') && videoRef.current) {
      if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(videoUrl);
        hls.attachMedia(videoRef.current);
        return () => {
          hls.destroy();
        };
      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        videoRef.current.src = videoUrl;
      }
    }
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


  const deriveSrtUrl = (hlsUrl: string): string => {
    // http://hlsmedia.wjthinkbig.com/hlsmedia/_definst_/smil:hlsmedia/BOOKCLUB/SMARTALL-MID/KORN/DTOP/APROACDY/1111/25280/VOD/VOD_64780.SMIL/playlist.m3u8
    // http://down.wjthinkbig.com/BOOKCLUB/SMARTALL-MID/KORN/DTOP/APROACDY/1111/25280/VOD/VOD_64780.SRT

    // Direct URL replacement for static deployment (CORS enabled on source)
    let srtUrl = hlsUrl.replace('http://hlsmedia.wjthinkbig.com/hlsmedia/_definst_/smil:hlsmedia/', 'http://down.wjthinkbig.com/');

    // Replace .SMIL/playlist.m3u8 or just /playlist.m3u8 with .SRT
    // Case insensitive replacement to be safe
    srtUrl = srtUrl.replace(/\.SMIL\/playlist\.m3u8$/i, '.SRT');
    srtUrl = srtUrl.replace(/\/playlist\.m3u8$/i, '.SRT');

    return srtUrl;
  };

  const loadHlsContent = async (url: string) => {
    if (!url) return;

    setStatus('loading'); // Set loading state immediately

    const srtUrl = deriveSrtUrl(url);
    const videoUrl = url; // Use direct URL
    const vFileName = url.split('/').pop() || 'stream.m3u8';

    console.log('Derived SRT URL:', srtUrl);
    console.log('Video URL:', videoUrl);

    setVideoUrl(videoUrl);
    setVideoFileName(vFileName);
    setFileName(srtUrl.split('/').pop() || 'subtitles.srt');
    setHlsUrlInput(url);

    // IMMEDIATE PLAYBACK: Open video popup right away
    handleOpenVideoInNewWindow(0, [], videoUrl, vFileName);

    try {
      console.log('Fetching SRT...');
      const response = await fetch(srtUrl);
      console.log('Fetch response status:', response.status);
      if (!response.ok) throw new Error('자막을 불러오는데 실패했습니다: ' + response.statusText);

      const blob = await response.blob();
      console.log('Blob size:', blob.size);

      // Try to decode as UTF-8 first
      let text = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsText(blob, 'utf-8');
      });

      // Check for replacement characters which indicate encoding mismatch
      // \uFFFD is the replacement character
      const replacementCount = (text.match(/\uFFFD/g) || []).length;
      console.log('UTF-8 replacement count:', replacementCount);

      let parsedSubtitles = parseSrt(text);

      // If many replacement characters or no subtitles found, try EUC-KR
      if (replacementCount > text.length * 0.05 || parsedSubtitles.length === 0) {
        console.log('Trying EUC-KR...');
        text = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsText(blob, 'euc-kr');
        });
        parsedSubtitles = parseSrt(text);
      }

      console.log('Parsed subtitles count:', parsedSubtitles.length);
      if (parsedSubtitles.length > 0) {
        setSrtContent(text);
        setSubtitles(parsedSubtitles);
        setPotentialErrors([]);
        setSelectedError(null);
        setErrorMessage('');
        setStatus('ready'); // Go directly to editor view

        // Update the already opened popup with subtitles
        if (videoWindowRef.current) {
          videoWindowRef.current.postMessage({
            type: 'UPDATE_SUBTITLES',
            subtitles: parsedSubtitles
          }, '*');
        }

      } else {
        setErrorMessage("URL에서 자막을 찾을 수 없습니다.");
        setStatus('error');
      }
    } catch (e) {
      console.error('Error in handleHlsSubmit:', e);
      setErrorMessage("자막 로드 실패: " + (e as Error).message);
      setStatus('error');
    }
  };

  const handleHlsSubmit = () => {
    loadHlsContent(hlsUrlInput);
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = new Uint8Array(event.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

      const parsedList: ExcelVideoEntry[] = jsonData
        .filter((row: any) => row.FILE_PATH && row.FILE_NAME)
        .map((row: any) => {
          const filePath = row.FILE_PATH;
          const fileName = row.FILE_NAME;
          // Construct URL based on user requirement
          const fullUrl = `http://hlsmedia.wjthinkbig.com/hlsmedia/_definst_/smil:hlsmedia/${filePath}${fileName}/playlist.m3u8`;

          return {
            FILE_PATH: row.FILE_PATH,
            FILE_NAME: row.FILE_NAME,
            FILE_TY_CD: row.FILE_TY_CD,
            fullUrl: fullUrl
          };
        });

      setVideoList(parsedList);
      if (parsedList.length > 0) {
        setCurrentView('list');
      } else {
        alert('엑셀 파일에서 유효한 동영상 항목을 찾을 수 없습니다.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleVideoSelect = (entry: ExcelVideoEntry) => {
    loadHlsContent(entry.fullUrl);
    setCurrentView('editor');
  };

  const handleBackToList = () => {
    setCurrentView('list');
    if (videoWindowRef.current && !videoWindowRef.current.closed) {
      videoWindowRef.current.postMessage({ type: 'PAUSE_VIDEO' }, '*');
    }
  };

  // Handle Query Param for URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlParam = params.get('url');
    if (urlParam) {
      loadHlsContent(urlParam);
    }
  }, []);

  const handleSrtUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Kept for reference but UI is hidden
    const file = event.target.files?.[0];
    if (!file) return;
  };

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Kept for reference but UI is hidden
    const file = event.target.files?.[0];
    if (!file) return;
  };

  const handleHideVideo = () => {
    setIsVideoVisible(false);
    if (videoRef.current) {
      videoRef.current.pause();
    }
  };

  const handleOpenVideoInNewWindow = (seekToTime: number = 0, initialSubtitles: SubtitleEntry[] = [], directVideoUrl?: string, directVideoFileName?: string) => {
    const targetVideoUrl = directVideoUrl || videoUrl;
    const targetVideoFileName = directVideoFileName || videoFileName;
    const targetSubtitles = initialSubtitles.length > 0 ? initialSubtitles : subtitles;

    if (!targetVideoUrl) return;

    // Check if window is already open and valid
    if (videoWindowRef.current && !videoWindowRef.current.closed) {
      // Update existing window
      try {
        videoWindowRef.current.postMessage({
          type: 'SEEK_VIDEO',
          time: seekToTime,
          subtitles: targetSubtitles
        }, '*');
        videoWindowRef.current.focus();
        return;
      } catch (e) {
        console.error('Failed to communicate with video window:', e);
        videoWindowRef.current = null;
      }
    }

    // Create new window
    const newWindow = window.open('', '_blank', 'width=1280,height=720,resizable=yes');
    if (!newWindow) {
      alert('팝업이 차단되었습니다. 팝업 차단을 해제해주세요.');
      return;
    }

    videoWindowRef.current = newWindow;

    const currentTime = seekToTime;
    const subtitlesJson = JSON.stringify(targetSubtitles);

    newWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Video Player - ${targetVideoFileName}</title>
            <meta charset="UTF-8">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                background: #000;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 100vw;
                height: 100vh;
                margin: 0;
                overflow: hidden; /* Prevent scrollbars */
                font-family: system-ui, -apple-system, sans-serif;
              }
              .video-container {
                position: relative;
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              video {
                max-width: 100%;
                max-height: 100%;
                width: auto;
                height: auto;
                object-fit: contain; /* Ensure video fits within container */
              }
              .subtitle-overlay {
                position: absolute;
                bottom: 5%;
                left: 50%;
                transform: translateX(-50%);
                color: #fff;
                padding: 8px 16px;
                font-size: 30px;
                font-weight: 700;
                text-align: center;
                max-width: 90%;
                white-space: pre-wrap;
                line-height: 1.5;
                pointer-events: none;
                display: none;
                -webkit-text-stroke: 1.5px black;
                text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.6);
                z-index: 10;
              }
              .play-button {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 80px;
                height: 80px;
                background: rgba(0, 0, 0, 0.6);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                z-index: 20;
                display: none; /* Hidden by default */
              }
              .play-button svg {
                width: 40px;
                height: 40px;
                fill: white;
                margin-left: 4px; /* Optical adjustment */
              }
              .play-button:hover {
                background: rgba(0, 0, 0, 0.8);
                transform: translate(-50%, -50%) scale(1.1);
              }
              .buffering-overlay {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 30;
                display: none; /* Hidden by default */
                pointer-events: none;
              }
              .spinner {
                width: 50px;
                height: 50px;
                border: 5px solid rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                border-top-color: #fff;
                animation: spin 1s ease-in-out infinite;
              }
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            </style>
          </head>
          <body>
            <div class="video-container" id="container">
              <video id="video" controls autoplay>
                ${targetVideoUrl.endsWith('.m3u8') ? '' : `<source src="${targetVideoUrl}" type="video/mp4">`}
              </video>
              <div class="subtitle-overlay" id="subtitle"></div>
              <div class="play-button" id="playBtn">
                <svg viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </div>
              <div class="buffering-overlay" id="buffering">
                <div class="spinner"></div>
              </div>
            </div>
            <script>
              const video = document.getElementById('video');
              const subtitle = document.getElementById('subtitle');
              const container = document.getElementById('container');
              const playBtn = document.getElementById('playBtn');
              const buffering = document.getElementById('buffering');
              let subtitles = ${subtitlesJson};

              video.currentTime = ${currentTime};

              // Buffering Logic
              const showBuffering = () => buffering.style.display = 'block';
              const hideBuffering = () => buffering.style.display = 'none';

              video.addEventListener('waiting', showBuffering);
              video.addEventListener('stalled', showBuffering);
              video.addEventListener('loadstart', showBuffering);
              
              video.addEventListener('playing', hideBuffering);
              video.addEventListener('canplay', hideBuffering);
              video.addEventListener('timeupdate', hideBuffering);

              // Play/Pause Logic
              video.addEventListener('click', (e) => {
                  e.preventDefault(); 
                  if (!video.paused) {
                      video.pause();
                      playBtn.style.display = 'flex';
                  } else {
                      video.play();
                      playBtn.style.display = 'none';
                  }
              });

              playBtn.addEventListener('click', () => {
                  video.play();
                  playBtn.style.display = 'none';
              });

              video.addEventListener('play', () => {
                  playBtn.style.display = 'none';
                  hideBuffering();
              });

              video.addEventListener('pause', () => {
                  playBtn.style.display = 'flex';
              });

              // Double Click Seek Logic
              container.addEventListener('dblclick', (e) => {
                  const rect = container.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const width = rect.width;

                  if (x < width / 2) {
                      video.currentTime = Math.max(0, video.currentTime - 10);
                  } else {
                      video.currentTime = Math.min(video.duration, video.currentTime + 10);
                  }
              });

              // Listen for messages from parent window
              window.addEventListener('message', (event) => {
                if (event.data.type === 'SEEK_VIDEO') {
                  video.currentTime = event.data.time;
                  if (event.data.subtitles) {
                    subtitles = event.data.subtitles;
                  }
                  // Force play immediately after seek
                  const playPromise = video.play();
                  if (playPromise !== undefined) {
                      playPromise.catch(error => {
                          console.error("Auto-play was prevented:", error);
                      });
                  }
                } else if (event.data.type === 'UPDATE_SUBTITLES') {
                    subtitles = event.data.subtitles;
                }
              });

              // HLS Support
              if ('${targetVideoUrl}'.endsWith('.m3u8')) {
                  const script = document.createElement('script');
                  script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
                  script.onload = () => {
                      if (Hls.isSupported()) {
                          const hls = new Hls();
                          hls.loadSource('${targetVideoUrl}');
                          hls.attachMedia(video);
                          hls.on(Hls.Events.MANIFEST_PARSED, function() {
                              video.currentTime = ${currentTime};
                              video.play().catch(e => console.error("Autoplay prevented:", e));
                          });
                          // HLS specific buffering handling
                          hls.on(Hls.Events.BUFFER_STALLED, showBuffering);
                          hls.on(Hls.Events.FRAG_BUFFERED, hideBuffering);
                      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                          video.src = '${targetVideoUrl}';
                          video.addEventListener('loadedmetadata', function() {
                              video.currentTime = ${currentTime};
                              video.play().catch(e => console.error("Autoplay prevented:", e));
                          });
                      }
                  };
                  document.head.appendChild(script);
              } else {
                  // For non-HLS videos
                   video.addEventListener('loadedmetadata', function() {
                      video.play().catch(e => console.error("Autoplay prevented:", e));
                  });
              }

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
      alert("SRT 파일을 먼저 업로드해주세요.");
      return;
    }

    const apiKey = getApiKey();
    if (!apiKey) {
      alert("API 키가 설정되지 않았습니다.");
      setApiKeyConfigured(false);
      return;
    }

    setIsAnalyzing(true);
    try {
      const errors = await findErrorsInSrt(srtContent, apiKey);
      setPotentialErrors(errors);
      if (errors.length === 0) {
        alert("자막 파일에서 오류를 발견하지 못했습니다.");
      }
    } catch (error) {
      const err = error as Error;
      setErrorMessage(err.message);
      setStatus('error');
    } finally {
      setIsAnalyzing(false);
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
              AI SRT 자막 교정기
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {subtitles.length > 0 && status === 'ready' && (
              <>
                <button
                  onClick={handleStartAnalysis}
                  disabled={isAnalyzing}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-2 px-4 rounded-lg transition-transform transform hover:scale-105 shadow"
                >
                  <SparklesIcon className={`w-5 h-5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                  {isAnalyzing ? '분석 중...' : '분석 시작'}
                </button>
                <button onClick={handleDownload} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-transform transform hover:scale-105 shadow">
                  <DownloadIcon className="w-5 h-5" />
                  다운로드
                </button>
              </>
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
        {currentView === 'upload' && (
          <div className="flex flex-col items-center justify-center h-[70vh]">
            <div className="w-full max-w-2xl space-y-6">
              {/* HLS Input Section */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                <label className="block text-lg font-semibold text-slate-700 dark:text-slate-300 mb-4">HLS 동영상 URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={hlsUrlInput}
                    onChange={(e) => setHlsUrlInput(e.target.value)}
                    placeholder="http://hlsmedia.wjthinkbig.com/..."
                    className="flex-1 p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                  <button
                    onClick={() => {
                      handleHlsSubmit();
                      setCurrentView('editor');
                    }}
                    disabled={!hlsUrlInput}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white font-bold py-3 px-6 rounded-lg transition-colors whitespace-nowrap"
                  >
                    불러오기
                  </button>
                </div>
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                  HLS URL (m3u8)을 입력하세요. 해당 SRT 자막 파일이 자동으로 로드됩니다.
                </p>
              </div>

              {/* Excel Upload Section */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                <label className="block text-lg font-semibold text-slate-700 dark:text-slate-300 mb-4">엑셀 일괄 업로드</label>
                <div className="flex items-center justify-center w-full">
                  <label htmlFor="excel-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 dark:border-slate-600 border-dashed rounded-lg cursor-pointer bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <UploadIcon className="w-8 h-8 mb-3 text-slate-400" />
                      <p className="mb-2 text-sm text-slate-500 dark:text-slate-400"><span className="font-semibold">클릭하여 업로드</span> 또는 드래그 앤 드롭</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">엑셀 파일 (.xlsx, .xls)</p>
                    </div>
                    <input id="excel-upload" type="file" className="hidden" accept=".xlsx, .xls" onChange={handleExcelUpload} />
                  </label>
                </div>
              </div>
            </div>
            {errorMessage && <p className="mt-4 text-red-500">{errorMessage}</p>}
          </div>
        )}

        {currentView === 'list' && (
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">동영상 목록</h2>
              <button onClick={() => setCurrentView('upload')} className="text-sm text-slate-500 hover:text-indigo-600">업로드로 돌아가기</button>
            </div>
            <div className="grid gap-4">
              {videoList.map((video, index) => (
                <div key={index} onClick={() => handleVideoSelect(video)} className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-200">{video.FILE_NAME}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{video.FILE_PATH}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{video.FILE_TY_CD}</p>
                  </div>
                  <div className="text-indigo-600 dark:text-indigo-400">
                    <VideoCameraIcon className="w-6 h-6" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentView === 'editor' && (
          <>
            <div className="mb-4 flex justify-between items-center">
              {videoList.length > 0 && (
                <button onClick={handleBackToList} className="flex items-center text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                  목록으로 돌아가기
                </button>
              )}
              {videoList.length === 0 && (
                <button onClick={() => setCurrentView('upload')} className="flex items-center text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                  업로드로 돌아가기
                </button>
              )}
            </div>

            {(status === 'analyzing' || status === 'loading') && (
              <div className="text-center flex flex-col items-center justify-center h-[60vh]">
                <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-indigo-500"></div>
                <p className="mt-4 text-xl font-semibold tracking-wider">
                  {status === 'analyzing' ? 'AI 분석 중...' : '자막 불러오는 중...'}
                </p>
                <p className="text-slate-500 dark:text-slate-400">{fileName}</p>
              </div>
            )}

            {status === 'idle' && (
              <div className="text-center flex flex-col items-center justify-center h-[60vh]">
                <p className="text-slate-500 dark:text-slate-400">동영상을 선택해주세요.</p>
              </div>
            )}

            {status === 'error' && (
              <div className="text-center flex flex-col items-center justify-center h-[60vh]">
                <div className="bg-red-100 dark:bg-red-900/50 border border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg relative max-w-md" role="alert">
                  <strong className="font-bold">오류! </strong>
                  <span className="block sm:inline">{errorMessage}</span>
                  <button onClick={() => { setStatus('idle'); setCurrentView('upload'); }} className="mt-4 w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded">다시 시도</button>
                </div>
              </div>
            )}

            {status === 'ready' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-lg sticky top-24">
                    <h2 className="text-lg font-bold mb-2">잠재적 오류 ({potentialErrors.length})</h2>
                    {potentialErrors.length > 0 ? (
                      <div className="max-h-[65vh] overflow-y-auto pr-2 space-y-2">
                        {potentialErrors.map(error => (
                          <div key={error.id} onClick={() => setSelectedError(error)} className={`p-3 rounded-md cursor-pointer transition-colors ${selectedError?.id === error.id ? 'bg-indigo-100 dark:bg-indigo-900/50' : 'hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}>
                            <p className="font-semibold text-red-500 dark:text-red-400">"{error.originalWord}"</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{error.context}</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">이유: {error.reason}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10">
                        {isAnalyzing ? (
                          <div className="flex flex-col items-center">
                            <div className="w-8 h-8 border-4 border-dashed rounded-full animate-spin border-indigo-500 mb-2"></div>
                            <p className="text-slate-500">자막 분석 중...</p>
                          </div>
                        ) : (
                          <>
                            <p className="font-semibold text-green-600 dark:text-green-400">발견된 오류가 없습니다.</p>
                            <p className="text-sm text-slate-500 mt-2">"분석 시작"을 클릭하여 오류를 검사하세요.</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-lg max-h-[85vh] overflow-y-auto">
                    <h2 className="text-lg font-bold mb-2 sticky top-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur py-2">미리보기: {fileName}</h2>
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
                                <h3 className="text-sm font-semibold mb-1 text-slate-700 dark:text-slate-300">추천 수정:</h3>
                                <div className="flex flex-wrap gap-2">
                                  {selectedError.suggestions.map((s, i) => (
                                    <button key={i} onClick={() => applySuggestionInEditor(s)} className="bg-slate-200 dark:bg-slate-700 hover:bg-indigo-200 dark:hover:bg-indigo-600 text-sm py-1 px-3 rounded-full transition-colors">{s}</button>
                                  ))}
                                </div>
                              </div>
                            )}
                            <div className="flex flex-col sm:flex-row gap-2 mt-4">
                              <button onClick={handleSaveEdit} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md transition-colors">저장</button>
                              {selectedError && (
                                <button onClick={handleIgnoreError} className="flex-1 bg-slate-500 hover:bg-slate-600 text-white font-semibold py-2 px-4 rounded-md transition-colors">무시</button>
                              )}
                              <button onClick={handleCancelEdit} className="flex-1 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-md transition-colors">취소</button>
                            </div>
                          </div>
                        ) : (
                          <div
                            key={sub.id}
                            ref={(el: HTMLDivElement | null) => { previewRefs.current[sub.id] = el; }}
                            onClick={() => handleSubtitleClick(sub.id)}
                            className={`p-3 rounded-md transition-all duration-300 cursor-pointer ${hasError
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
          </>
        )}
      </main>
    </div>
  );
};

export default App;