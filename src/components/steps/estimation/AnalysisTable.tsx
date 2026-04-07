'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';

interface AnalysisTableProps {
  title: string;
  icon: React.ReactNode;
  levels: {
    name: string;
    valueData: Record<string, number>;
    ratioKeys: Record<string, string>;
  }[];
  ratios: Record<string, number>;
  onRatioChange: (key: string, val: string) => void;
  formatNum: (val: number) => string;
}

export function AnalysisTable({ 
  title, 
  icon, 
  levels, 
  ratios, 
  onRatioChange, 
  formatNum 
}: AnalysisTableProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-primary border-b-2 border-primary/10 pb-4">
        {icon}
        <h3 className="text-2xl font-headline font-black uppercase tracking-tight">{title}</h3>
      </div>
      <div className="border-2 rounded-2xl overflow-hidden shadow-2xl bg-white">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent border-b-2">
              <TableHead className="w-[120px] text-xs font-black uppercase text-center border-r-2 text-primary">Analysis Level</TableHead>
              <TableHead className="w-[100px] text-xs font-black uppercase text-center border-r-2 text-primary">Metric</TableHead>
              {Object.keys(levels[0].valueData).map(key => (
                <TableHead key={key} className="text-xs font-black uppercase text-center">{key.charAt(0).toUpperCase() + key.slice(1)}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {levels.map((level) => (
              <AnalysisLevelRows 
                key={level.name}
                level={level}
                ratios={ratios}
                onRatioChange={onRatioChange}
                formatNum={formatNum}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function AnalysisLevelRows({ 
  level, 
  ratios, 
  onRatioChange, 
  formatNum 
}: { 
  level: any, 
  ratios: any, 
  onRatioChange: any, 
  formatNum: any 
}) {
  const metrics: ('VALUE' | 'RATIO' | 'LOSS')[] = ['VALUE', 'RATIO', 'LOSS'];
  
  return (
    <>
      {metrics.map((metric, idx) => (
        <TableRow key={metric} className="hover:bg-transparent">
          {idx === 0 && (
            <TableCell rowSpan={3} className="text-xs font-black text-primary uppercase text-center bg-muted/10 border-r-2 border-b-2">
              {level.name}
            </TableCell>
          )}
          <TableCell className={`text-[10px] font-black uppercase text-center border-r-2 ${metric === 'LOSS' ? 'border-b-2' : ''} bg-muted/5`}>
            {metric === 'VALUE' ? 'Asset Value' : metric === 'RATIO' ? 'Loss %' : 'Loss Value'}
          </TableCell>
          {Object.entries(level.valueData).map(([key, value]: [string, any]) => {
            const ratioKey = level.ratioKeys[key];
            const currentRatio = ratios[ratioKey] || 0;
            
            return (
              <TableCell key={key} className={`text-center py-2 px-4 ${metric === 'LOSS' ? 'border-b-2' : ''}`}>
                <div className="flex flex-col items-center justify-center h-full w-full">
                  {metric === 'VALUE' && (
                    <span className="text-sm font-mono font-bold text-primary">{formatNum(value)}M</span>
                  )}
                  {metric === 'RATIO' && ratioKey && (
                    <div className="relative inline-flex items-center">
                      <Input 
                        type="number" 
                        step="0.1" 
                        value={currentRatio} 
                        onChange={(e) => onRatioChange(ratioKey, e.target.value)} 
                        className="h-8 w-24 text-center font-mono font-black border-none bg-muted/30 text-sm focus-visible:ring-accent" 
                      />
                      <span className="absolute -right-4 text-[10px] font-black text-muted-foreground/50">%</span>
                    </div>
                  )}
                  {metric === 'LOSS' && ratioKey && (
                    <span className="text-sm font-mono font-black text-destructive">
                      {formatNum((currentRatio / 100) * value)}M
                    </span>
                  )}
                </div>
              </TableCell>
            );
          })}
        </TableRow>
      ))}
    </>
  );
}
