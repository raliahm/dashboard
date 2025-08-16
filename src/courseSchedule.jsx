import { useState, useEffect, useRef, useCallback } from 'react';
import { CourseModule } from './courseModule.jsx';
import { ScheduleParser } from './scheduleParser.js';

export function CourseSchedule() {
  const [modules, setModules] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [progressStats, setProgressStats] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [courseName, setCourseName] = useState('');
  const [savedCourses, setSavedCourses] = useState([]);
  const [activeCourseId, setActiveCourseId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef(null);

  // Get user data from parent component (similar to other trackers)
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [idToken, setIdToken] = useState(() => localStorage.getItem('idToken'));

  // Load schedules from database on mount
  useEffect(() => {
    if (!user || !idToken) {
      setIsLoading(false);
      return;
    }
    loadSchedulesFromDatabase();
  }, [user, idToken]);

  const loadSchedulesFromDatabase = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/schedules', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          // Clear invalid tokens and redirect to sign in
          localStorage.removeItem('user');
          localStorage.removeItem('idToken');
          setUser(null);
          setIdToken(null);
          return;
        }
        throw new Error('Failed to fetch schedules');
      }
      
      const schedules = await response.json();
      
      // Convert database format to component format
      const formattedCourses = schedules.map(schedule => ({
        id: schedule.course_id,
        name: schedule.course_name,
        scheduleData: schedule.schedule_data,
        createdAt: schedule.created_at
      }));
      
      setSavedCourses(formattedCourses);
      
      if (formattedCourses.length > 0) {
        // Load the first course (no localStorage dependency)
        await loadCourse(formattedCourses[0]);
      }
    } catch (error) {
      console.error('Error loading schedules:', error);
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        // Clear invalid tokens
        localStorage.removeItem('user');
        localStorage.removeItem('idToken');
        setUser(null);
        setIdToken(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadCourse = async (course) => {
    if (!course) return;
    
    const parsedModules = ScheduleParser.parseScheduleData(course.scheduleData, course.id);
    setModules(parsedModules);
    setCourseName(course.name);
    setActiveCourseId(course.id);
    
    // Load progress from database
    if (user && idToken) {
      try {
        const response = await fetch(`/api/schedule_progress?course_id=${course.id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
        });
        
        if (response.ok) {
          const progressData = await response.json();
          const progressMap = {};
          
          progressData.forEach(progress => {
            const readingProgressArray = JSON.parse(progress.reading_progress || '[]');
            progressMap[progress.module_id] = {
              readingProgress: readingProgressArray, // Keep the actual array, not just count
              homeworkStatus: progress.homework_status,
              hasNotes: progress.notes?.length > 0,
              notes: progress.notes || ''
            };
          });
          
          setProgressStats(progressMap);
        } else if (response.status === 401) {
          // Handle expired token
          localStorage.removeItem('user');
          localStorage.removeItem('idToken');
          setUser(null);
          setIdToken(null);
        }
      } catch (error) {
        console.error('Error loading progress:', error);
      }
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target.result;
        const lines = content.split('\n');
        
        if (lines.length < 2) {
          alert('File must contain at least a header and one data row');
          return;
        }

        const courseId = `course-${Date.now()}`;
        const fileName = file.name.replace(/\.[^/.]+$/, "");
        
        // Save to database if user is logged in
        if (user && idToken) {
          const response = await fetch('/api/schedules', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              course_id: courseId,
              course_name: fileName,
              schedule_data: content,
            }),
          });
          
          if (!response.ok) {
            throw new Error('Failed to save schedule to database');
          }
          
          // Reload schedules from database
          await loadSchedulesFromDatabase();
          
          // Load the new course
          const newCourse = savedCourses.find(c => c.id === courseId);
          if (newCourse) {
            await loadCourse(newCourse);
          }
        } else {
          throw new Error('Please sign in to save courses');
        }
        
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
        alert(`Successfully imported "${fileName}"!`);
      } catch (error) {
        console.error('Error uploading schedule:', error);
        alert('Error uploading file: ' + error.message);
      }
    };

    reader.readAsText(file);
  };

  const deleteCourse = async (courseId) => {
    if (confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      try {
        // Delete from database if user is logged in
        if (user && idToken) {
          const response = await fetch(`/api/schedules/${courseId}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${idToken}`,
            },
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to delete schedule from database: ${errorData.error || response.statusText}`);
          }
        }
        
        // Reload schedules from database
        await loadSchedulesFromDatabase();
        
        // Clear progress stats for the deleted course
        setProgressStats(prev => {
          const newStats = { ...prev };
          Object.keys(newStats).forEach(moduleId => {
            if (moduleId.startsWith(courseId)) {
              delete newStats[moduleId];
            }
          });
          return newStats;
        });

        if (courseId === activeCourseId) {
          if (savedCourses.length > 1) {
            // Load the first remaining course
            const remainingCourse = savedCourses.find(c => c.id !== courseId);
            if (remainingCourse) {
              await loadCourse(remainingCourse);
            }
          } else {
            setModules([]);
            setCourseName('');
            setActiveCourseId(null);
          }
        }
      } catch (error) {
        console.error('Error deleting course:', error);
        alert('Error deleting course: ' + error.message);
      }
    }
  };

  const handleProgressUpdate = useCallback(async (moduleId, progress) => {
    setProgressStats(prev => ({
      ...prev,
      [moduleId]: progress
    }));
    
    // Save progress to database if user is logged in
    if (activeCourseId && user && idToken) {
      try {
        const requestBody = {
          course_id: activeCourseId,
          module_id: moduleId,
          reading_progress: Array.isArray(progress.readingProgress) ? progress.readingProgress : [],
          homework_status: progress.homeworkStatus || 'not-started',
          notes: progress.notes || '',
        };
        
        const response = await fetch('/api/schedule_progress', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify(requestBody),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('🥀 API Error:', errorData);
          throw new Error(`Failed to save progress: ${errorData.error || response.statusText}`);
        }
        
        const savedData = await response.json();
        console.log('🌺 Progress saved successfully for:', moduleId);
        
      } catch (error) {
        console.error('🥀 Error saving progress:', error);
        alert(`Failed to save progress to database: ${error.message}\nYour changes are saved locally.`);
      }
    }
  }, [activeCourseId, user, idToken]); // Dependencies for useCallback

  const filteredModules = modules.filter(module => {
    const matchesStatus = filterStatus === 'all' || module.status === filterStatus;
    const matchesSearch = searchTerm === '' || 
      module.topics.toLowerCase().includes(searchTerm.toLowerCase()) ||
      module.readings.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  const getOverallStats = () => {
    // Only count modules that have actual content
    const contentModules = modules.filter(module => {
      const hasReadings = module.readings && module.readings.trim();
      const hasHomework = module.homework && module.homework.trim();
      return hasReadings || hasHomework;
    });
    
    const totalModules = contentModules.length;
    
    // Calculate actual completed modules based on user progress, not just dates
    let actuallyCompletedModules = 0;
    let totalCompletedReadings = 0;
    let totalReadings = 0;
    
    contentModules.forEach(module => {
      const moduleProgress = progressStats[module.id];
      let moduleIsComplete = false;
      
      const hasReadings = module.readings && module.readings.trim();
      const hasHomework = module.homework && module.homework.trim();
      
      if (hasReadings) {
        const moduleReadings = module.readings.split(',').map(r => r.trim()).filter(r => r);
        totalReadings += moduleReadings.length;
        
        // Get completed readings for this module
        if (moduleProgress && moduleProgress.readingProgress) {
          // Handle both array and number formats
          let completedCount = 0;
          if (Array.isArray(moduleProgress.readingProgress)) {
            completedCount = moduleProgress.readingProgress.length;
          } else if (typeof moduleProgress.readingProgress === 'number') {
            completedCount = moduleProgress.readingProgress;
          }
          totalCompletedReadings += completedCount;
          
          // Module is complete if all readings are done AND homework is complete (if it exists)
          const allReadingsComplete = completedCount >= moduleReadings.length;
          const homeworkComplete = hasHomework ? (moduleProgress.homeworkStatus === 'completed') : true;
          
          if (allReadingsComplete && homeworkComplete) {
            moduleIsComplete = true;
          }
        }
      } else if (hasHomework) {
        // If no readings, just check homework completion
        if (moduleProgress && moduleProgress.homeworkStatus === 'completed') {
          moduleIsComplete = true;
        }
      }
      
      if (moduleIsComplete) {
        actuallyCompletedModules++;
      }
    });

    return {
      moduleProgress: `${actuallyCompletedModules}/${totalModules}`,
      readingProgress: `${totalCompletedReadings}/${totalReadings}`,
      overallCompletion: totalModules > 0 ? Math.round((actuallyCompletedModules / totalModules) * 100) : 0
    };
  };

  const stats = getOverallStats();

  // Loading state
  if (isLoading) {
    return (
      <div className="course-schedule-wrapper bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-2xl p-8 border-2 border-blue-200 shadow-lg w-full">
        <div className="loading-screen text-center">
          <span className="text-6xl mb-4 block animate-spin">🌸</span>
          <h2 className="text-2xl font-bold text-blue-700 mb-2">
            Loading Schedules...
          </h2>
          <p className="text-blue-600">
            Fetching your course data from the database
          </p>
        </div>
      </div>
    );
  }

  // Show welcome screen if no courses uploaded
  if (savedCourses.length === 0) {
    return (
      <div className="course-schedule-wrapper bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-2xl p-8 border-2 border-blue-200 shadow-lg w-full">
        <div className="welcome-screen text-center">
          <div className="mb-6">
           
            <h2 className="text-3xl font-bold text-blue-700 mb-2">
              <span className="text-6xl mb-4 block animate-bounce">📚</span> Welcome to Course Schedules
            </h2>
            <p className="text-blue-600 text-lg font-medium mb-6">
              {!user ? 'Sign in and upload your first course schedule to get started!' : 'Upload your first course schedule to get started!'}
            </p>
          </div>

          {/* Upload Area - Only show if user is logged in */}
          {user && idToken ? (
            <>
              <div className="upload-area bg-white bg-opacity-70 rounded-2xl p-8 border-2 border-dashed border-blue-300 mb-6 hover:border-blue-500 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.tsv,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="schedule-upload"
                />
                <label
                  htmlFor="schedule-upload"
                  className="cursor-pointer block"
                >
                  <div className="text-4xl mb-4">📁</div>
                  <h3 className="text-xl font-semibold text-blue-700 mb-2">
                    Click to Upload Schedule
                  </h3>
                  <p className="text-blue-600 text-sm">
                    Supports .txt, .tsv, and .csv files
                  </p>
                </label>
              </div>

              {/* Instructions */}
              <div className="instructions bg-blue-100 border-2 border-blue-200 rounded-xl p-6 text-left">
                <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                  📋 File Format Instructions
                </h4>
                <div className="text-sm text-blue-700 space-y-2">
                  <p>• Upload tab-separated (.txt, .tsv) or comma-separated (.csv) files</p>
                  <p>• Required columns: <code className="bg-blue-200 px-2 py-1 rounded">Date | Topics | Readings | Homework | Comment</code></p>
                  <p>• Example format:</p>
                  <pre className="bg-blue-200 p-3 rounded mt-2 text-xs overflow-x-auto">
{`Date	Topics	Readings	Homework	Comment
Tue 8/19	Introduction to Class	Ch. 1-2		Week 1
Thu 8/21	Basic Concepts	Ch. 3	Assignment 1 due	Week 1`}
                  </pre>
                </div>
              </div>
            </>
          ) : (
            <div className="auth-prompt bg-blue-100 border-2 border-blue-200 rounded-xl p-6">
              <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                🔐 Authentication Required
              </h4>
              <p className="text-blue-700">
                Please sign in with Google to save and sync your course schedules across devices.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Rest of your existing JSX remains the same...
  return (
    <div className="course-schedule-wrapper bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-blue-200 shadow-lg w-full">
      {/* Course Management Header */}
      <div className="course-management mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
         
            <select
              value={activeCourseId || ''}
              onChange={(e) => {
                const course = savedCourses.find(c => c.id === e.target.value);
                if (course) loadCourse(course);
              }}
              className="cottagecore-select cottagecore-input-small cottagecore-input-blue min-w-[200px]"
            >
              {savedCourses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            {user && idToken && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.tsv,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="schedule-upload"
                />
                <label
                  htmlFor="schedule-upload"
                  className="cottagecore-btn cottagecore-btn-small cottagecore-btn-purple cursor-pointer"
                >
                  📁 Upload Schedule
                </label>
                
                {savedCourses.length > 0 && (
                  <button
                    onClick={() => deleteCourse(activeCourseId)}
                    className="cottagecore-btn cottagecore-btn-small cottagecore-btn-red"
                    title="Delete current course"
                  >
                    🗑️ Delete
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Current Course Info */}
        {courseName && (
          <div className="current-course-info bg-white bg-opacity-60 rounded-xl p-4 border-2 border-blue-200">
            <h3 className="font-bold text-blue-800 text-lg mb-2">{courseName}</h3>
            
            {/* Progress Overview Cards */}
            <div className="progress-overview grid grid-cols-3 gap-3">
              <article className="bg-green-100 border-2 border-green-200 rounded-xl px-4 py-3 shadow-md text-green-700 text-sm font-semibold flex flex-col items-center transform hover:scale-105 transition-transform duration-200">
                <span className="text-xs mb-1">Modules: </span>
                <span className="text-lg font-bold">{stats.moduleProgress}</span>
              </article>
              
              <article className="bg-purple-100 border-2 border-purple-200 rounded-xl px-4 py-3 shadow-md text-purple-700 text-sm font-semibold flex flex-col items-center transform hover:scale-105 transition-transform duration-200">
                <span className="text-xs mb-1">Readings: </span>
                <span className="text-lg font-bold">{stats.readingProgress}</span>
              </article>
              
              <article className="bg-pink-100 border-2 border-pink-200 rounded-xl px-4 py-3 shadow-md text-pink-700 text-sm font-semibold flex flex-col items-center transform hover:scale-105 transition-transform duration-200">
                <span className="text-xs mb-1">Complete: </span>
                <span className="text-lg font-bold">{stats.overallCompletion}%</span>
              </article>
            </div>
          </div>
        )}
      </div>

      {/* Rest of the component remains the same... */}
      {/* Filters, Modules List, Progress Garden */}
      {modules.length > 0 && (
        <div className="schedule-filters mb-6 bg-white bg-opacity-60 rounded-xl p-4 border-2 border-blue-200 backdrop-blur-sm">
          <div className="flex gap-4 flex-wrap items-end">
            <div className="filter-group min-w-[160px]">
              <label className="block text-sm font-semibold mb-2 text-blue-700 flex items-center gap-1">
                🌿 Filter Status:
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="cottagecore-input cottagecore-input-small cottagecore-input-blue w-full"
              >
                <option value="all">All Modules</option>
                <option value="upcoming">🌱 Upcoming</option>
                <option value="current">📖 Current</option>
                <option value="completed">✅ Completed</option>
              </select>
            </div>
            
            <div className="search-group flex-1 min-w-[200px]">
              <label className="block text-sm font-semibold mb-2 text-blue-700 flex items-center gap-1">
                🔍 Search Topics:
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search topics, readings..."
                className="cottagecore-input cottagecore-input-small cottagecore-input-blue w-full"
              />
            </div>
            
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="cottagecore-btn cottagecore-btn-small cottagecore-btn-blue mt-6"
              >
                Clear 🌸
              </button>
            )}
              {/* Course Progress Garden */}
      {/* Heart-Based Flower Garden */}
      {modules.length > 0 && (
        <div className="progress-garden mt-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 border-2 border-green-200">
          <h4 className="font-semibold text-green-700 mb-4 text-center flex items-center justify-center gap-2">
            💚 Your Heart Garden
          </h4>
          
          {(() => {
            // Calculate total possible hearts (modules + all readings)
            let totalPossibleHearts = 0;
            let earnedHearts = 0;
            
            modules.forEach(module => {
              // Only count modules that have actual content (readings or homework)
              const hasReadings = module.readings && module.readings.trim();
              const hasHomework = module.homework && module.homework.trim();
              
              // Skip modules with no content
              if (!hasReadings && !hasHomework) {
                return;
              }
              
              // Count module completion as 1 heart (only if it has homework)
              if (hasHomework) {
                totalPossibleHearts += 1;
              }
              
              // Count each reading as 1 heart
              if (hasReadings) {
                const moduleReadings = module.readings.split(',').map(r => r.trim()).filter(r => r);
                totalPossibleHearts += moduleReadings.length;
                
                // Count earned hearts from this module
                const progress = progressStats[module.id];
                if (progress) {
                  // Hearts from completed readings
                  if (progress.readingProgress && Array.isArray(progress.readingProgress)) {
                    earnedHearts += progress.readingProgress.length;
                  }
                  // Heart from module completion (homework done) - only if module has homework
                  if (hasHomework && progress.homeworkStatus === 'completed') {
                    earnedHearts += 1;
                  }
                }
              }
            });
            
            const flowers = Math.floor(earnedHearts / 3); // 1 flower per 3 hearts
            
            return (
              <div className="single-garden-bed">
                {/* Progress Stats */}
                <div className="progress-stats text-center mb-4">
                  <p className="text-green-700 font-semibold text-lg">
                    💚 {earnedHearts}/{totalPossibleHearts} Hearts Earned
                  </p>
                  <p className="text-green-600 text-sm">
                    🌸 {flowers} Flowers Bloomed (1 flower per 3 hearts)
                  </p>
                </div>
                
                {/* Single Large Flower Bed with Hearts and Flowers */}
                <div className="main-garden-bed bg-gradient-to-b from-amber-50 to-green-100 rounded-2xl p-6 border-3 border-amber-200 relative overflow-hidden min-h-[200px]">
                  {/* Garden Ground */}
                  <div className="garden-soil absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-amber-800 to-amber-600 rounded-b-2xl"></div>
                  
                  {/* Floating Hearts in the Garden */}
                  <div className="floating-hearts absolute inset-0 p-4">
                    {Array.from({ length: earnedHearts }, (_, index) => (
                      <div
                        key={index}
                        className="floating-heart absolute"
                        style={{
                          left: `${15 + (index * 8) % 70}%`,
                          top: `${20 + (Math.sin(index) * 30 + 30)}%`,
                          transform: `rotate(${(index * 15) % 60 - 30}deg)`,
                          animationDelay: `${index * 0.2}s`,
                          fontSize: `${1.2 + (index % 3) * 0.3}rem`
                        }}
                        title={`Heart ${index + 1} - Earned!`}
                      >
                        <span className="text-red-500 animate-pulse hover:scale-125 transition-transform cursor-pointer">
                          ❤️
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Flowers in the Garden */}
                  <div className="garden-flowers absolute inset-0 p-4">
                    {Array.from({ length: flowers }, (_, index) => {
                      const flowerTypes = [
                        'cottagecore-flower-pink',
                        'cottagecore-flower-orange',  
                        'cottagecore-flower-purple',
                        'cottagecore-flower-yellow',
                        'cottagecore-berry',
                      ];
                      
                      const flowerType = flowerTypes[index % flowerTypes.length];
                      
                      return (
                        <div
                          key={index}
                          className="garden-flower absolute"
                          style={{
                            left: `${25 + (index * 15) % 50}%`,
                            bottom: `${30 + (index % 3) * 20}%`,
                            transform: `scale(${1.2 + (index % 2) * 0.3})`,
                            animationDelay: `${index * 0.5}s`
                          }}
                          title={`${flowerType.replace('cottagecore-', '').replace('-', ' ')} - Bloomed from ${(index + 1) * 3} hearts!`}
                        >
                          <div className="garden-ground">
                            <div className={`cottagecore-plant ${flowerType} animate-bounce`} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Special garden creatures */}
                  {flowers >= 3 && (
                    <div className="garden-creatures absolute inset-0">
                      <div 
                        className="cottagecore-butterfly absolute"
                        style={{ 
                          right: '20%', 
                          top: '25%',
                          animationDelay: '1s'
                        }}
                        title="Beautiful garden attracted a butterfly!"
                      />
                      {flowers >= 6 && (
                        <div 
                          className="cottagecore-ladybug absolute"
                          style={{ 
                            left: '25%', 
                            bottom: '40%',
                            animationDelay: '2s'
                          }}
                          title="Lucky ladybug found your garden!"
                        />
                      )}
                    </div>
                  )}
                  
                  {/* Growing spots for next flowers */}
                  {earnedHearts % 3 > 0 && (
                    <div className="next-flower absolute" style={{ right: '30%', bottom: '35%' }}>
                      <div className="garden-ground">
                        <div className={`cottagecore-plant ${earnedHearts % 3 === 1 ? 'plant-seed' : 'plant-sprout'} animate-pulse`} />
                      </div>
                      <div className="text-xs text-green-600 text-center mt-1 font-medium">
                        {earnedHearts % 3}/3 hearts
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
          
          <p className="text-center text-green-600 text-sm mt-4 font-medium">
            Complete readings and assignments to add hearts and grow flowers in your garden! 🌿
          </p>
        </div>
      )}
          </div>
        </div>
      )}

      {/* Modules List */}
      <div className="modules-list space-y-4 max-h-[800px] overflow-y-auto pr-2">
        {filteredModules.length > 0 ? (
          filteredModules.map((module, index) => (
            <div 
              key={module.id}
              className="module-wrapper transform transition-all duration-300 hover:scale-[1.01]"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <CourseModule
                module={module}
                onProgressUpdate={handleProgressUpdate}
                initialProgress={progressStats[module.id]}
              />
            </div>
          ))
        ) : modules.length > 0 ? (
          <div className="no-modules text-center py-12 bg-white bg-opacity-70 rounded-2xl border-2 border-gray-300 backdrop-blur-sm">
            <div className="animate-bounce mb-4">
              <span className="text-6xl">🌿</span>
            </div>
            <p className="text-gray-600 text-lg font-semibold mb-2">No modules found</p>
            <p className="text-gray-500 text-sm">Try adjusting your filters or search term</p>
            {(filterStatus !== 'all' || searchTerm) && (
              <button
                onClick={() => {
                  setFilterStatus('all');
                  setSearchTerm('');
                }}
                className="cottagecore-btn cottagecore-btn-small cottagecore-btn-purple mt-4"
              >
                🌸 Show All Modules
              </button>
            )}
          </div>
        ) : null}
      </div>

    
    </div>
  );
}