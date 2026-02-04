import { useState, useEffect } from 'react';
import { Tag, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export type LifeDomain = 'visa' | 'work' | 'health' | 'finance' | 'study' | 'housing' | 'legal' | 'general';

export const LIFE_DOMAINS: { value: LifeDomain; label: string; color: string }[] = [
  { value: 'visa', label: 'Visa', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200' },
  { value: 'work', label: 'Work', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200' },
  { value: 'health', label: 'Health', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' },
  { value: 'finance', label: 'Finance', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200' },
  { value: 'study', label: 'Study', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200' },
  { value: 'housing', label: 'Housing', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200' },
  { value: 'legal', label: 'Legal', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200' },
  { value: 'general', label: 'General', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200' },
];

// Auto-detect domain from title/description
export function detectDomain(title: string, description: string): LifeDomain {
  const text = `${title} ${description}`.toLowerCase();
  
  const visaKeywords = ['visa', 'passport', 'immigration', 'bridging', 'migration', 'citizenship', 'travel document'];
  const workKeywords = ['work', 'job', 'employment', 'salary', 'payroll', 'contract', 'shift', 'roster'];
  const healthKeywords = ['health', 'medical', 'doctor', 'hospital', 'medicare', 'insurance', 'vaccination', 'appointment'];
  const financeKeywords = ['tax', 'bank', 'payment', 'loan', 'rent', 'bill', 'finance', 'money', 'superannuation'];
  const studyKeywords = ['study', 'university', 'school', 'course', 'enrol', 'exam', 'assignment', 'education'];
  const housingKeywords = ['lease', 'rental', 'property', 'accommodation', 'moving', 'landlord', 'tenant'];
  const legalKeywords = ['legal', 'court', 'lawyer', 'police', 'license', 'registration', 'compliance'];

  if (visaKeywords.some(k => text.includes(k))) return 'visa';
  if (workKeywords.some(k => text.includes(k))) return 'work';
  if (healthKeywords.some(k => text.includes(k))) return 'health';
  if (financeKeywords.some(k => text.includes(k))) return 'finance';
  if (studyKeywords.some(k => text.includes(k))) return 'study';
  if (housingKeywords.some(k => text.includes(k))) return 'housing';
  if (legalKeywords.some(k => text.includes(k))) return 'legal';
  
  return 'general';
}

interface DomainBadgeProps {
  domain: LifeDomain;
  className?: string;
}

export function DomainBadge({ domain, className }: DomainBadgeProps) {
  const domainConfig = LIFE_DOMAINS.find(d => d.value === domain) || LIFE_DOMAINS[LIFE_DOMAINS.length - 1];
  
  return (
    <Badge 
      variant="secondary" 
      className={cn(
        'text-xs font-medium px-2 py-0.5',
        domainConfig.color,
        className
      )}
    >
      {domainConfig.label}
    </Badge>
  );
}

interface DomainSelectorProps {
  value: LifeDomain;
  onChange: (domain: LifeDomain) => void;
  className?: string;
}

export function DomainSelector({ value, onChange, className }: DomainSelectorProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as LifeDomain)}>
      <SelectTrigger 
        className={cn('w-32 h-10 sm:h-8 text-sm sm:text-xs', className)}
        aria-label="Select life domain"
      >
        <Tag className="w-3 h-3 mr-1" aria-hidden="true" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LIFE_DOMAINS.map((domain) => (
          <SelectItem key={domain.value} value={domain.value} className="text-sm sm:text-xs">
            {domain.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface DomainFilterProps {
  selectedDomains: LifeDomain[];
  onChange: (domains: LifeDomain[]) => void;
  className?: string;
}

export function DomainFilter({ selectedDomains, onChange, className }: DomainFilterProps) {
  const toggleDomain = (domain: LifeDomain) => {
    if (selectedDomains.includes(domain)) {
      onChange(selectedDomains.filter(d => d !== domain));
    } else {
      onChange([...selectedDomains, domain]);
    }
  };

  return (
    <div 
      className={cn('flex flex-wrap gap-2', className)} 
      role="group" 
      aria-label="Filter by life domain"
    >
      {LIFE_DOMAINS.map((domain) => {
        const isSelected = selectedDomains.includes(domain.value);
        return (
          <button
            key={domain.value}
            onClick={() => toggleDomain(domain.value)}
            className={cn(
              'px-3 py-2 sm:px-2.5 sm:py-1 rounded-full text-sm sm:text-xs transition-all min-h-[44px] sm:min-h-0',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              isSelected 
                ? domain.color
                : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
            )}
            aria-pressed={isSelected}
            aria-label={`Filter by ${domain.label}${isSelected ? ' (active)' : ''}`}
          >
            {domain.label}
            {isSelected && (
              <X className="w-3 h-3 ml-1 inline-block" aria-hidden="true" />
            )}
          </button>
        );
      })}
    </div>
  );
}
