// src/utils/scheduleParser.js
export class ScheduleParser {
  static parseScheduleData(rawData) {
    const lines = rawData.trim().split('\n');
    const modules = [];
    
    lines.forEach((line, index) => {
      if (index === 0) return; // Skip header
      
      const [date, topics, readings, homework, comment] = line.split('\t');
      
      if (date && topics) {
        modules.push({
          id: `module-${index}`,
          date: this.parseDate(date),
          topics: topics.trim(),
          readings: readings?.trim() || '',
          homework: homework?.trim() || '',
          comment: comment?.trim() || '',
          status: this.getModuleStatus(date),
          plantGrowth: this.calculatePlantGrowth(date, homework)
        });
      }
    });
    
    return modules;
  }
  
  static parseDate(dateStr) {
    const cleanDate = dateStr.replace(/[MW]\s*/, ''); // Remove M/W prefix
    const currentYear = new Date().getFullYear();
    return new Date(`${cleanDate}/${currentYear}`);
  }
  
  static getModuleStatus(date) {
    const now = new Date();
    const moduleDate = this.parseDate(date);
    
    if (moduleDate < now) return 'completed';
    if (moduleDate.toDateString() === now.toDateString()) return 'current';
    return 'upcoming';
  }
  
  static calculatePlantGrowth(date, homework) {
    const status = this.getModuleStatus(date);
    if (status === 'completed') return Math.random() * 3 + 2; // 2-5 growth
    if (status === 'current') return 1;
    return 0;
  }
}

// Course data structure
export const FALL_2025_SCHEDULE = `
Date	Topics	Readings	Homework	Comment
W 8-20	Introduction 	Ch. 1-2		
M 8/25	Growth of Functions	Ch. 3		
27-Aug	Data Structures, Binary Search Trees, Heaps, B-tree	Ch. 6, 10, 12, 18		
3-Sep	Divide&Conquer (DC): MergeSort	Sec. 2.3		
M 9/8	DC: Recurrences	Ch. 4.3-4.5		
10-Sep	DC: Quick Sort	Ch. 7		
M 9/15	DC: Radix Sort, Selection	Ch. 8-9	 Hwk#1 due	
17-Sep	DC: Strassen's	Sec. 4.2		
M 9/22	DC: Convex Hulls	Sec. 33.3		
24-Sep	Randomized Algorithms (RA), RQuickSort	Sec. 5.1-5.3		
M 9/29	RA: Skip Lists	Handouts	 Hwk#2 due	
1-Oct	Disjoint Sets	Sec. 21.1-21.3		
M 10/6	Exam I			
8-Oct	Elementary Graph Algorithms	Sec. 22.1-22.3		
15-Oct	Greedy: Minimum Spanning Tree	Ch. 23		
M 10/20	Greedy: Single Src Shortest Paths (Dijkstra)	Sec. 24.3	 Hwk#3 due	
22-Oct	Dynamic Programming (DP)	Sec. 15.2-3		
M 10/27	DP: LCS	Sec. 15.4		
29-Oct	DP: Bellman-Ford, All-Pairs Shortest Paths	Sec. 24.1, 25.1-25.2		
M 11/3	Net Flow	Sec. 26.1		
5-Nov	Max Flow: Ford-Fullerson	Sec. 26.2	  Hwk#4 due	
M 11/10	Review			
12-Nov	Exam II			
M 11/17	Lower Bound and Reduction	Sec. 8.1		
19-Nov	NP: Non-det. Alg., P, NP, NP-Completeness	Preface of Ch. 34, 34.2		
M 11/24	NP: 3SAT	Sec. 34.4		
M 12/1	NP: Clique, VC	Sec. 34.5.1-2, 5		
3-Dec	Subset Sum, Partition, Review		Hwk#5 and paper due	
M 12/8	Exam III  3:30pm-5:30pm			
`;