import { useMemo, useState } from 'react';
import { Obligation, ObligationStatus, ObligationUpdate } from '@/types/obligation';
import { ObligationCard } from './ObligationCard';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, Folder, BookOpen, Briefcase, GraduationCap } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';

interface GroupedBySubjectProps {
  obligations: Obligation[];
  onStatusChange: (id: string, status: ObligationStatus) => Promise<void> | void;
  onUpdate: (id: string, updates: ObligationUpdate) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  className?: string;
}

interface SubjectGroup {
  subject: string;
  icon: React.ReactNode;
  topics: TopicGroup[];
  totalCount: number;
  pendingCount: number;
}

interface TopicGroup {
  topic: string;
  obligations: Obligation[];
}

// Detect subject from obligation title/description
function detectSubject(ob: Obligation): string {
  if (ob.subject) return ob.subject;
  
  const text = `${ob.title} ${ob.description}`.toLowerCase();
  
  // Common patterns for course codes (e.g., COMP9417, MATH1234)
  const courseCodeMatch = text.match(/[A-Z]{2,4}\s?\d{4}/i);
  if (courseCodeMatch) return courseCodeMatch[0].toUpperCase().replace(/\s/g, '');
  
  // Detect by domain
  if (ob.domain === 'study') {
    // Look for assignment/exam patterns
    if (text.includes('assignment') || text.includes('essay') || text.includes('exam')) {
      return 'Study';
    }
  }
  if (ob.domain === 'work') return 'Work';
  if (ob.domain === 'visa') return 'Immigration';
  if (ob.domain === 'health') return 'Health';
  if (ob.domain === 'finance') return 'Finance';
  if (ob.domain === 'housing') return 'Housing';
  if (ob.domain === 'legal') return 'Legal';
  
  // Extract common keywords
  if (text.includes('tax')) return 'Tax';
  if (text.includes('rent') || text.includes('lease')) return 'Housing';
  if (text.includes('visa') || text.includes('immigration')) return 'Immigration';
  if (text.includes('doctor') || text.includes('medical') || text.includes('health')) return 'Health';
  
  return 'General';
}

// Detect topic/assignment from obligation title
function detectTopic(ob: Obligation): string {
  if (ob.topic) return ob.topic;
  
  const text = `${ob.title}`.toLowerCase();
  
  // Look for assignment numbers
  const assignmentMatch = text.match(/assignment\s*(\d+)/i);
  if (assignmentMatch) return `Assignment ${assignmentMatch[1]}`;
  
  // Look for quiz/exam
  if (text.includes('final exam')) return 'Final Exam';
  if (text.includes('midterm')) return 'Midterm';
  if (text.includes('quiz')) return 'Quiz';
  if (text.includes('lab')) return 'Lab';
  if (text.includes('project')) return 'Project';
  
  return 'Tasks';
}

function getSubjectIcon(subject: string): React.ReactNode {
  const s = subject.toLowerCase();
  if (s.includes('comp') || s.includes('study') || /^[A-Z]{2,4}\d{4}$/.test(subject)) {
    return <GraduationCap className="w-4 h-4" />;
  }
  if (s === 'work') return <Briefcase className="w-4 h-4" />;
  return <BookOpen className="w-4 h-4" />;
}

export function GroupedBySubject({ 
  obligations, 
  onStatusChange, 
  onUpdate, 
  onDelete,
  className 
}: GroupedBySubjectProps) {
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());

  const subjectGroups = useMemo<SubjectGroup[]>(() => {
    const subjectMap = new Map<string, Map<string, Obligation[]>>();
    
    // Group by subject, then by topic
    obligations.forEach(ob => {
      const subject = detectSubject(ob);
      const topic = detectTopic(ob);
      
      if (!subjectMap.has(subject)) {
        subjectMap.set(subject, new Map());
      }
      const topicMap = subjectMap.get(subject)!;
      
      if (!topicMap.has(topic)) {
        topicMap.set(topic, []);
      }
      topicMap.get(topic)!.push(ob);
    });
    
    // Convert to array and sort
    const groups: SubjectGroup[] = [];
    
    subjectMap.forEach((topicMap, subject) => {
      const topics: TopicGroup[] = [];
      let totalCount = 0;
      let pendingCount = 0;
      
      topicMap.forEach((obs, topic) => {
        topics.push({ topic, obligations: obs });
        totalCount += obs.length;
        pendingCount += obs.filter(o => o.status !== 'completed').length;
      });
      
      // Sort topics by first obligation's due date
      topics.sort((a, b) => {
        const dateA = a.obligations[0]?.deadline?.getTime() ?? Infinity;
        const dateB = b.obligations[0]?.deadline?.getTime() ?? Infinity;
        return dateA - dateB;
      });
      
      groups.push({
        subject,
        icon: getSubjectIcon(subject),
        topics,
        totalCount,
        pendingCount,
      });
    });
    
    // Sort subjects: those with pending items first, then alphabetically
    groups.sort((a, b) => {
      if (a.pendingCount > 0 && b.pendingCount === 0) return -1;
      if (b.pendingCount > 0 && a.pendingCount === 0) return 1;
      return a.subject.localeCompare(b.subject);
    });
    
    return groups;
  }, [obligations]);

  const toggleSubject = (subject: string) => {
    setExpandedSubjects(prev => {
      const next = new Set(prev);
      if (next.has(subject)) {
        next.delete(subject);
      } else {
        next.add(subject);
      }
      return next;
    });
  };

  if (obligations.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
        <Folder className="w-4 h-4" />
        <span>Grouped by Subject</span>
      </div>
      
      {subjectGroups.map(group => {
        const isExpanded = expandedSubjects.has(group.subject);
        
        return (
          <Collapsible
            key={group.subject}
            open={isExpanded}
            onOpenChange={() => toggleSubject(group.subject)}
            className="border border-border rounded-lg bg-card overflow-hidden"
          >
            <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-accent/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary">
                  {group.icon}
                </div>
                <div className="text-left">
                  <h3 className="font-medium text-foreground">{group.subject}</h3>
                  <p className="text-xs text-muted-foreground">
                    {group.pendingCount} pending · {group.topics.length} {group.topics.length === 1 ? 'topic' : 'topics'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {group.pendingCount > 0 && (
                  <Badge variant="secondary" className="bg-[hsl(var(--priority-medium-bg))] text-[hsl(var(--priority-medium))]">
                    {group.pendingCount} pending
                  </Badge>
                )}
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <div className="border-t border-border">
                {group.topics.map(topic => (
                  <div key={topic.topic} className="p-4 border-b border-border last:border-b-0">
                    <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                      {topic.topic}
                    </h4>
                    <div className="space-y-3 ml-3">
                      {topic.obligations.map(ob => (
                        <ObligationCard
                          key={ob.id}
                          obligation={ob}
                          onStatusChange={onStatusChange}
                          onUpdate={onUpdate}
                          onDelete={onDelete}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}
