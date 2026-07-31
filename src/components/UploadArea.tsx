import { useCallback, useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/hooks/useI18n';

export interface LoadedFiles {
  lootCsv: { text: string; filename: string } | null;
  bankTsv: { text: string; filename: string } | null;
}

interface UploadAreaProps {
  files: LoadedFiles;
  onFilesChange: (files: LoadedFiles) => void;
  onParse: () => void;
}

export function UploadArea({ files, onFilesChange, onParse }: UploadAreaProps) {
  const { t } = useI18n();
  const [isDragging, setIsDragging] = useState(false);
  const lootInputRef = useRef<HTMLInputElement>(null);
  const bankInputRef = useRef<HTMLInputElement>(null);

  const canParse = !!files.lootCsv;

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    processFiles(droppedFiles);
  }, []);

  const processFiles = (droppedFiles: File[]) => {
    for (const file of droppedFiles) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        if (!text) return;

        if (file.name.endsWith('.csv')) {
          onFilesChange({ ...files, lootCsv: { text, filename: file.name } });
        } else if (file.name.endsWith('.txt') || file.name.endsWith('.tsv')) {
          onFilesChange({ ...files, bankTsv: { text, filename: file.name } });
        }
      };
      reader.readAsText(file);
    }
  };

  const clearLoot = () => onFilesChange({ ...files, lootCsv: null });
  const clearBank = () => onFilesChange({ ...files, bankTsv: null });

  return (
    <div className="w-full space-y-6">
      <input ref={lootInputRef} type="file" accept=".csv" className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            const r = new FileReader();
            r.onload = (ev) => {
              const text = ev.target?.result as string;
              if (text) onFilesChange({ ...files, lootCsv: { text, filename: f.name } });
            };
            r.readAsText(f);
          }
        }}
      />
      <input ref={bankInputRef} type="file" accept=".txt,.tsv" className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            const r = new FileReader();
            r.onload = (ev) => {
              const text = ev.target?.result as string;
              if (text) onFilesChange({ ...files, bankTsv: { text, filename: f.name } });
            };
            r.readAsText(f);
          }
        }}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Loot CSV — left side */}
        <Card
          className={`border-2 border-dashed transition-all cursor-pointer bg-[#111] min-h-[320px] ${
            files.lootCsv ? 'border-emerald-600' : isDragging ? 'border-amber-500 bg-amber-950/20' : 'border-gray-700 hover:border-gray-500'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => lootInputRef.current?.click()}
        >
          <CardContent className="p-10 text-center flex flex-col items-center justify-center min-h-[320px]">
            {files.lootCsv ? (
              <div className="space-y-4">
                <FileText className="w-14 h-14 mx-auto text-emerald-500" />
                <p className="font-medium text-gray-300 text-lg truncate">{files.lootCsv.filename}</p>
                <p className="text-base text-emerald-500">{t('loot_loaded')}</p>
                <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-300 h-9"
                  onClick={(e) => { e.stopPropagation(); clearLoot(); }}>
                  <X className="w-4 h-4 mr-1" />{t('change')}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="w-14 h-14 mx-auto text-gray-600" />
                <p className="font-medium text-gray-300 text-xl">{t('upload_loot_log')}</p>
                <p className="text-base text-gray-500">{t('drag_or_click')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bank TSV — right side */}
        <Card
          className={`border-2 border-dashed transition-all cursor-pointer bg-[#111] min-h-[320px] ${
            files.bankTsv ? 'border-blue-600' : isDragging ? 'border-amber-500 bg-amber-950/20' : 'border-gray-700 hover:border-gray-500'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => bankInputRef.current?.click()}
        >
          <CardContent className="p-10 text-center flex flex-col items-center justify-center min-h-[320px]">
            {files.bankTsv ? (
              <div className="space-y-4">
                <FileText className="w-14 h-14 mx-auto text-blue-500" />
                <p className="font-medium text-gray-300 text-lg truncate">{files.bankTsv.filename}</p>
                <p className="text-base text-blue-500">{t('bank_loaded')}</p>
                <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-300 h-9"
                  onClick={(e) => { e.stopPropagation(); clearBank(); }}>
                  <X className="w-4 h-4 mr-1" />{t('change')}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="w-14 h-14 mx-auto text-gray-600" />
                <p className="font-medium text-gray-300 text-xl">{t('upload_bank_log')}</p>
                <p className="text-base text-gray-500">{t('bank_log_optional')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="text-center">
        <Button
          disabled={!canParse}
          className="bg-amber-600 hover:bg-amber-700 text-white px-8"
          onClick={onParse}
        >
          {t('analyze')}
        </Button>
        {!canParse && <p className="text-xs text-gray-500 mt-2">{t('upload_required')}</p>}
      </div>
    </div>
  );
}
