import { useState, useEffect } from 'react';

export function PlantGrowth({ growth, moduleStatus, progress }) {
  const [currentStage, setCurrentStage] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Calculate plant stage based on progress
  useEffect(() => {
    const totalProgress = progress.reading + (progress.homework === 'completed' ? 2 : 0);
    const maxProgress = progress.totalReadings + 2;
    const progressRatio = maxProgress > 0 ? totalProgress / maxProgress : 0;
    
    let newStage = 0;
    if (progressRatio >= 0.8) newStage = 4; // Full bloom
    else if (progressRatio >= 0.6) newStage = 3; // Flowering
    else if (progressRatio >= 0.4) newStage = 2; // Growing
    else if (progressRatio >= 0.2) newStage = 1; // Sprout
    
    if (newStage !== currentStage) {
      setIsAnimating(true);
      setCurrentStage(newStage);
      setTimeout(() => setIsAnimating(false), 600);
    }
  }, [progress, currentStage]);

  const getHealthHearts = () => {
    const progressRatio = (progress.reading + (progress.homework === 'completed' ? 2 : 0)) / (progress.totalReadings + 2);
    const heartCount = Math.ceil(progressRatio * 4);
    
    let hearts = '';
    for (let i = 0; i < 4; i++) {
      if (i < heartCount) {
        hearts += '❤️';
      } else {
        hearts += '🤍';
      }
    }
    return hearts;
  };

  const getPlantStage = () => {
    switch (currentStage) {
      case 0: return { emoji: '🌱', color: 'from-gray-300 to-gray-400' };
      case 1: return { emoji: '🌿', color: 'from-green-200 to-green-300' };
      case 2: return { emoji: '🌳', color: 'from-green-300 to-green-500' };
      case 3: return { emoji: '🌸', color: 'from-pink-300 to-pink-500' };
      case 4: return { emoji: '🌺', color: 'from-pink-500 to-purple-500' };
      default: return { emoji: '🌱', color: 'from-gray-300 to-gray-400' };
    }
  };

  const getPlantMessage = () => {
    switch (currentStage) {
      case 0: return 'Ready to grow!';
      case 1: return 'First sprout!';
      case 2: return 'Growing strong!';
      case 3: return 'Starting to bloom!';
      case 4: return 'Full bloom!';
      default: return 'Plant your seeds!';
    }
  };

  const progressRatio = (progress.reading + (progress.homework === 'completed' ? 2 : 0)) / (progress.totalReadings + 2);
  const plant = getPlantStage();

  return (
    <div className="plant-growth flex flex-col items-center space-y-2 p-3">
      {/* Health Hearts Display */}
      <div className="hearts-display text-sm" title={`Progress: ${Math.round(progressRatio * 100)}%`}>
        {getHealthHearts()}
      </div>
      
      {/* Game-style Health Bar */}
      <div className="game-health-bar">
        <div 
          className="game-health-fill"
          style={{ width: `${progressRatio * 100}%` }}
        />
      </div>
      
      {/* Plant Container */}
      <div 
        className={`plant-container text-2xl transition-all duration-500 ${
          isAnimating ? 'scale-125 animate-bounce' : 'hover:scale-110'
        }`}
        title={getPlantMessage()}
      >
        {plant.emoji}
      </div>
      
      {/* Game-style Potion */}
      <div className="game-potion">
        <div 
          className={`game-potion-fill ${progressRatio === 0 ? 'game-potion-empty' : ''}`}
          style={{ height: `${Math.max(10, progressRatio * 90)}%` }}
        >
          {progressRatio > 0.3 && <div className="game-potion-bubbles" />}
        </div>
      </div>
      
      {/* Status Text */}
      <div className="status-text text-xs text-center text-gray-600 font-medium">
        {getPlantMessage()}
      </div>
      
      {/* Energy/XP Bar (Lightning Style) */}
      {progressRatio > 0 && (
        <div className="flex items-center space-x-1">
          <span className="text-yellow-500 text-xs">⚡</span>
          <div className="w-12 h-1 bg-gray-300 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-500"
              style={{ width: `${progressRatio * 100}%` }}
            />
          </div>
          <span className="text-xs text-gray-500">{Math.round(progressRatio * 100)}</span>
        </div>
      )}
    </div>
  );
}