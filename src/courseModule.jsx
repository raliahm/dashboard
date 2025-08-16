import { useState, useEffect, useCallback } from 'react';
import { PlantGrowth } from './PlantGrowth.jsx';

export function CourseModule({ module, onProgressUpdate, initialProgress }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [readingProgress, setReadingProgress] = useState(() => {
    // Use initial progress from database first, then fallback to localStorage
    if (initialProgress?.readingProgress) {
      return Array.isArray(initialProgress.readingProgress) ? initialProgress.readingProgress : [];
    }
    const saved = localStorage.getItem(`reading-${module.id}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [homeworkStatus, setHomeworkStatus] = useState(() => {
    // Use initial progress from database first, then fallback to localStorage
    if (initialProgress?.homeworkStatus) {
      return initialProgress.homeworkStatus;
    }
    const saved = localStorage.getItem(`homework-${module.id}`);
    return saved || 'not-started';
  });
  const [notes, setNotes] = useState(() => {
    // Use initial progress from database first, then fallback to localStorage
    if (initialProgress?.notes) {
      return initialProgress.notes;
    }
    const saved = localStorage.getItem(`notes-${module.id}`);
    return saved || '';
  });
  
  // Debounced notes for API calls (separate from display notes)
  const [debouncedNotes, setDebouncedNotes] = useState(notes);

  // Update state when initialProgress changes (from database load)
  useEffect(() => {
    if (initialProgress) {
      if (initialProgress.readingProgress && Array.isArray(initialProgress.readingProgress)) {
        setReadingProgress(initialProgress.readingProgress);
      }
      if (initialProgress.homeworkStatus) {
        setHomeworkStatus(initialProgress.homeworkStatus);
      }
      if (initialProgress.notes) {
        setNotes(initialProgress.notes);
      }
    }
  }, [initialProgress]);

  useEffect(() => {
    // Save to localStorage
    localStorage.setItem(`reading-${module.id}`, JSON.stringify(readingProgress));
  }, [readingProgress, module.id]);

  useEffect(() => {
    // Save to localStorage
    localStorage.setItem(`homework-${module.id}`, homeworkStatus);
  }, [homeworkStatus, module.id]);

  useEffect(() => {
    // Save to localStorage immediately (for instant feedback)
    localStorage.setItem(`notes-${module.id}`, notes);
  }, [notes, module.id]);

  // Debounce notes for API calls (wait 1 second after user stops typing)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedNotes(notes);
    }, 1000); // 1 second delay

    return () => clearTimeout(timer);
  }, [notes]);

  // Update parent component about progress (separate effects for instant vs debounced)
  useEffect(() => {
    // Update reading progress and homework immediately
    onProgressUpdate?.(module.id, {
      readingProgress: readingProgress,
      homeworkStatus,
      hasNotes: debouncedNotes.length > 0,
      notes: debouncedNotes // Use debounced notes for API calls
    });
  }, [readingProgress, homeworkStatus, module.id]);

  // Separate effect for debounced notes updates
  useEffect(() => {
    // Only update notes when debounced notes change
    onProgressUpdate?.(module.id, {
      readingProgress: readingProgress,
      homeworkStatus,
      hasNotes: debouncedNotes.length > 0,
      notes: debouncedNotes
    });
  }, [debouncedNotes, module.id]);
  const getStatusColor = () => {
    switch (module.status) {
      case 'completed': return 'bg-green-50 border-green-400 text-green-800';
      case 'current': return 'bg-blue-50 border-blue-400 text-blue-800';
      case 'upcoming': return 'bg-purple-50 border-purple-400 text-purple-700';
      default: return 'bg-gray-50 border-gray-400 text-gray-600';
    }
  };

  const getStatusIcon = () => {
    switch (module.status) {
      case 'completed': return '✅';
      case 'current': return '📖';
      case 'upcoming': return '📅';
      default: return '📚';
    }
  };

  const parseReadings = (readings) => {
    if (!readings) return [];
    return readings.split(',').map(r => r.trim()).filter(r => r);
  };

  const toggleReadingComplete = (reading) => {
    setReadingProgress(prev => 
      prev.includes(reading) 
        ? prev.filter(r => r !== reading)
        : [...prev, reading]
    );
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getNotesWordCount = () => {
    return notes.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  return (
    <div className={`course-module rounded-2xl border-4 border-solid p-6 mb-4 transition-all duration-300 shadow-lg hover:shadow-xl ${getStatusColor()} ${isExpanded ? 'transform scale-[1.01] border-purple-400' : ''} relative overflow-hidden`} style={{
      borderStyle: 'solid',
      borderWidth: '3px',
      boxShadow: '0 4px 15px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)'
    }}>
      
      {/* Module Header */}
      <div 
        className="module-header cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-3xl">{getStatusIcon()}</span>
            <div>
              <h3 className="font-bold text-xl">{module.topics}</h3>
              <p className="text-sm opacity-75 font-medium">{formatDate(module.date)}</p>
              {notes && (
                <p className="text-xs text-purple-600 mt-1 font-medium">
                  📝 {getNotesWordCount()} words in notes
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <PlantGrowth 
              growth={module.plantGrowth} 
              moduleStatus={module.status}
              progress={{
                reading: readingProgress.length,
                homework: homeworkStatus,
                totalReadings: parseReadings(module.readings).length
              }}
            />
            <span className="text-2xl transform transition-transform duration-300">
              {isExpanded ? '🔽' : '▶️'}
            </span>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="module-content mt-6 space-y-6 animate-fade-in">
          
          {/* Two-column layout for better space utilization */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left Column - Readings and Homework */}
            <div className="space-y-6">
              {/* Readings Section */}
              {module.readings && (
                <div className="readings-section bg-white bg-opacity-60 rounded-2xl p-4 border-2 border-purple-200">
                  <h4 className="font-bold text-lg mb-3 flex items-center gap-2 text-purple-700">
                    📖 Readings
                    <span className="text-xs bg-purple-100 text-purple-600 px-3 py-1 rounded-full border border-purple-300">
                      {readingProgress.length}/{parseReadings(module.readings).length}
                    </span>
                  </h4>
                  <div className="space-y-3">
                    {parseReadings(module.readings).map((reading, index) => (
                      <label key={index} className="flex items-center gap-3 cursor-pointer hover:bg-purple-50 p-2 rounded-lg transition-colors">
                        <input
                          type="checkbox"
                          checked={readingProgress.includes(reading)}
                          onChange={() => toggleReadingComplete(reading)}
                          className="accent-purple-500 scale-125"
                        />
                        <span className={`text-sm font-medium ${readingProgress.includes(reading) ? 'line-through opacity-60 text-purple-400' : 'text-purple-800'}`}>
                          {reading}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Homework Section */}
              {module.homework && (
                <div className="homework-section bg-white bg-opacity-60 rounded-2xl p-4 border-2 border-pink-200">
                  <h4 className="font-bold text-lg mb-3 flex items-center gap-2 text-pink-700">
                    📝 Assignment
                  </h4>
                  <div className="bg-pink-50 rounded-xl p-4 border border-pink-200">
                    <p className="text-sm mb-3 font-medium text-pink-800">{module.homework}</p>
                    <select
                      value={homeworkStatus}
                      onChange={(e) => setHomeworkStatus(e.target.value)}
                      className="cottagecore-select cottagecore-input-small cottagecore-input-pink w-full"
                    >
                      <option value="not-started">🌱 Not Started</option>
                      <option value="in-progress">🌿 In Progress</option>
                      <option value="review">🌸 Ready for Review</option>
                      <option value="completed">🌺 Completed</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Comment Section */}
              {module.comment && (
                <div className="comment-section bg-white bg-opacity-60 rounded-2xl p-4 border-2 border-yellow-200">
                  <h4 className="font-bold text-lg mb-3 flex items-center gap-2 text-yellow-700">
                    💭 Additional Info
                  </h4>
                  <p className="text-sm bg-yellow-50 rounded-xl p-3 border border-yellow-200 text-yellow-800 font-medium">
                    {module.comment}
                  </p>
                </div>
              )}
            </div>

            {/* Right Column - Enhanced Notes Section */}
            <div className="notes-column">
              <div className="notes-section bg-white bg-opacity-60 rounded-2xl p-4 border-2 border-green-200 h-full min-h-[400px]">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-lg flex items-center gap-2 text-green-700">
                    🌸 Study Notes
                  </h4>
                  <div className="text-xs text-green-600 font-medium">
                    {getNotesWordCount()} words
                  </div>
                </div>
                
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={`Add your notes for "${module.topics}"...\n\n• Key concepts\n• Important formulas\n• Questions to ask\n• Connection to other topics\n• Study tips`}
                  className="cottagecore-textarea cottagecore-input-small cottagecore-input-green w-full h-full min-h-[350px] resize-none leading-relaxed"
                  style={{ fontFamily: 'Georgia, serif', fontSize: '14px', lineHeight: '1.6' }}
                />
                
                {/* Note-taking helpers */}
                <div className="note-helpers mt-3 flex gap-2 flex-wrap">
                  <button
                    onClick={() => setNotes(prev => prev + '\n\n📝 Key Points:\n• ')}
                    className="cottagecore-btn cottagecore-btn-small cottagecore-btn-green text-xs"
                  >
                    + Key Points
                  </button>
                  <button
                    onClick={() => setNotes(prev => prev + '\n\n❓ Questions:\n• ')}
                    className="cottagecore-btn cottagecore-btn-small cottagecore-btn-blue text-xs"
                  >
                    + Questions
                  </button>
                  <button
                    onClick={() => setNotes(prev => prev + '\n\n💡 Ideas:\n• ')}
                    className="cottagecore-btn cottagecore-btn-small cottagecore-btn-yellow text-xs"
                  >
                    + Ideas
                  </button>
                  <button
                    onClick={() => setNotes(prev => prev + `\n\n📅 ${new Date().toLocaleDateString()}: `)}
                    className="cottagecore-btn cottagecore-btn-small cottagecore-btn-purple text-xs"
                  >
                    + Date
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}