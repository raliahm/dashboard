// src/components/AssignmentTracker.jsx
import { useState, useEffect } from 'react';

export function AssignmentTracker({ modules }) {
  const [assignments, setAssignments] = useState([]);

  useEffect(() => {
    // Extract assignments from modules
    const extractedAssignments = modules
      .filter(module => module.homework)
      .map(module => ({
        id: module.id,
        title: module.homework,
        dueDate: module.date,
        topic: module.topics,
        status: localStorage.getItem(`homework-${module.id}`) || 'not-started',
        priority: getDueDatePriority(module.date)
      }))
      .sort((a, b) => a.dueDate - b.dueDate);

    setAssignments(extractedAssignments);
  }, [modules]);

  const getDueDatePriority = (dueDate) => {
    const now = new Date();
    const daysDiff = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
    
    if (daysDiff < 0) return 'overdue';
    if (daysDiff <= 3) return 'urgent';
    if (daysDiff <= 7) return 'soon';
    return 'upcoming';
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'overdue': return 'bg-red-100 border-red-400 text-red-800';
      case 'urgent': return 'bg-orange-100 border-orange-400 text-orange-800';
      case 'soon': return 'bg-yellow-100 border-yellow-400 text-yellow-800';
      case 'upcoming': return 'bg-green-100 border-green-400 text-green-800';
      default: return 'bg-gray-100 border-gray-400 text-gray-800';
    }
  };

  const updateAssignmentStatus = (assignmentId, newStatus) => {
    localStorage.setItem(`homework-${assignmentId}`, newStatus);
    setAssignments(prev => 
      prev.map(assignment => 
        assignment.id === assignmentId 
          ? { ...assignment, status: newStatus }
          : assignment
      )
    );
  };

  return (
    <div className="assignment-tracker">
      <h2 className="text-2xl font-bold text-purple-700 mb-4 text-center">
        📝 Assignment Due Dates
      </h2>
      
      <div className="assignments-grid space-y-3">
        {assignments.map(assignment => (
          <div 
            key={assignment.id}
            className={`assignment-card p-4 rounded-xl border-2 ${getPriorityColor(assignment.priority)}`}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-semibold">{assignment.title}</h3>
                <p className="text-sm opacity-75">{assignment.topic}</p>
              </div>
              <span className="text-xs px-2 py-1 bg-white bg-opacity-50 rounded-full">
                {assignment.dueDate.toLocaleDateString()}
              </span>
            </div>
            
            <select
              value={assignment.status}
              onChange={(e) => updateAssignmentStatus(assignment.id, e.target.value)}
              className="w-full p-2 rounded-lg border border-current bg-white bg-opacity-70 text-sm"
            >
              <option value="not-started">Not Started</option>
              <option value="in-progress">In Progress</option>
              <option value="review">Ready for Review</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}