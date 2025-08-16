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

  const getPlantEmoji = () => {
    switch (currentStage) {
      case 0: return '🌱'; // Seed
      case 1: return '🌿'; // Sprout
      case 2: return '🌳'; // Growing
      case 3: return '🌸'; // Flowering
      case 4: return '🌺'; // Full bloom
      default: return '🌱';
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

  return (
    <div className="plant-growth flex flex-col items-center">
      <div 
        className={`plant-container text-3xl transition-all duration-500 ${
          isAnimating ? 'scale-125 animate-bounce' : 'hover:scale-110'
        }`}
        title={getPlantMessage()}
      >
        {getPlantEmoji()}
      </div>
      <div className="growth-bar w-8 h-2 bg-gray-200 rounded-full mt-1 overflow-hidden">
        <div 
          className="growth-fill h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-500 rounded-full"
          style={{ width: `${(currentStage / 4) * 100}%` }}
        />
      </div>
    </div>
  );
}