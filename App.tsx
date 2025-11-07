
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { SubtitleEntry, PotentialError } from './types';
import { parseSrt, stringifySrt } from './services/srtParser';
import { findErrorsInSrt } from './services/geminiService';
import { UploadIcon, DownloadIcon, LightbulbIcon, MoonIcon, SparklesIcon, VideoCameraIcon, XIcon } from './components/icons';

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
  const [subtitles, setSubtitles] = useState<SubtitleEntry[]>([]);
  const [srtContent, setSrtContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoFileName, setVideoFileName] = useState<string>('');
  const [potentialErrors, setPotentialErrors] = useState<PotentialError[]>([]);
  const [selectedError, setSelectedError] = useState<PotentialError | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const [status, setStatus] = useState<AppStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isVideoVisible, setIsVideoVisible] = useState(true);


  const srtInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewRefs = useRef<Record<number, HTMLDivElement | null>>({});

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

  // Handles setting the text for the editor when an error is selected
  useEffect(() => {
    if (selectedError) {
      const subtitleToEdit = subtitles.find(sub => sub.id === selectedError.subtitleId);
      if (subtitleToEdit) {
        setEditingText(subtitleToEdit.text);
      }
    } else {
      setEditingText('');
    }
  }, [selectedError, subtitles]);

  // Ensures video player becomes visible when an error is selected
  useEffect(() => {
    if (selectedError && videoUrl) {
      setIsVideoVisible(true);
    }
  }, [selectedError, videoUrl]);

  // Scrolls to subtitle, seeks and plays video when an error is selected and the player is visible
  useEffect(() => {
    if (selectedError && isVideoVisible && videoUrl) {
      // Scroll subtitle into view
      previewRefs.current[selectedError.subtitleId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });

      // Seek and play video
      if (videoRef.current) {
        const subtitle = subtitles.find(sub => sub.id === selectedError.subtitleId);
        if (subtitle) {
          const seekTime = srtTimeToSeconds(subtitle.startTime);
          // Only seek if the time difference is significant to avoid jitter
          if (Math.abs(videoRef.current.currentTime - seekTime) > 0.5) {
             videoRef.current.currentTime = seekTime;
          }
          videoRef.current.play().catch(e => console.error("Autoplay was prevented:", e));
        }
      }
    }
  }, [selectedError, isVideoVisible, videoUrl, subtitles]);


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

  const handleStartAnalysis = async () => {
      if (!srtContent) {
          alert("Please upload an SRT file first.");
          return;
      }
      setStatus('analyzing');
      try {
        const errors = await findErrorsInSrt(srtContent);
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
  
  const handleSaveEdit = useCallback(() => {
    if (!selectedError) return;

    setSubtitles(prev =>
      prev.map(sub =>
        sub.id === selectedError.subtitleId
          ? { ...sub, text: editingText }
          : sub
      )
    );

    setPotentialErrors(prev => prev.filter(err => err.id !== selectedError.id));
    setSelectedError(null);
  }, [selectedError, editingText]);

  const handleCancelEdit = useCallback(() => {
    setSelectedError(null);
  }, []);

  const handleIgnoreError = useCallback(() => {
    if (!selectedError) return;
    setPotentialErrors(prev => prev.filter(err => err.id !== selectedError.id));
    setSelectedError(null);
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
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              {isDarkMode ? <LightbulbIcon className="w-6 h-6" /> : <MoonIcon className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>
      
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
                 {videoUrl && isVideoVisible && (
                    <div className="bg-black rounded-lg shadow-lg sticky top-24 overflow-hidden">
                        <video ref={videoRef} src={videoUrl} controls className="w-full rounded-t-md aspect-video" />
                        <div 
                            onClick={handleHideVideo}
                            className="group flex items-center justify-between p-1 pl-3 bg-slate-800 dark:bg-slate-900 cursor-pointer hover:bg-slate-700 dark:hover:bg-slate-700 transition-colors"
                            title="Hide video player"
                        >
                            <p className="text-xs text-center text-slate-400 truncate">{videoFileName}</p>
                            <div className="p-1 rounded-full group-hover:bg-slate-600">
                                <XIcon className="w-4 h-4 text-slate-300"/>
                            </div>
                        </div>
                    </div>
                )}
                 {videoUrl && !isVideoVisible && (
                    <div className="sticky top-24">
                        <button 
                            onClick={() => setIsVideoVisible(true)}
                            className="w-full flex items-center justify-center gap-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 font-semibold py-2 px-4 rounded-lg transition-colors shadow-sm"
                        >
                            <VideoCameraIcon className="w-5 h-5"/>
                            Show Video Player
                        </button>
                    </div>
                )}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-lg max-h-[80vh] overflow-y-auto">
                    <h2 className="text-lg font-bold mb-2 sticky top-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur py-2">Preview: {fileName}</h2>
                    <div className="space-y-4 font-mono text-sm">
                        {subtitles.map(sub => {
                            const isEditing = selectedError?.subtitleId === sub.id;
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
                                    <button onClick={handleIgnoreError} className="flex-1 bg-slate-500 hover:bg-slate-600 text-white font-semibold py-2 px-4 rounded-md transition-colors">Ignore</button>
                                    <button onClick={handleCancelEdit} className="flex-1 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-md transition-colors">Cancel</button>
                                  </div>
                              </div>
                            ) : (
                              <div key={sub.id} ref={el => { previewRefs.current[sub.id] = el; }} className={'p-3 rounded-md transition-all duration-300 bg-slate-50 dark:bg-slate-700/30'}>
                                  <p className="text-xs text-slate-400">{sub.id} | {sub.startTime} --&gt; {sub.endTime}</p>
                                  <p className="text-base whitespace-pre-wrap text-slate-800 dark:text-slate-100">
                                    {sub.text}
                                  </p>
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