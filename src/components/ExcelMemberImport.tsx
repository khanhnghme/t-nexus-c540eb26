import { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, XCircle, ArrowRight, ArrowLeft, Table2 } from 'lucide-react';
import type * as XLSXType from 'xlsx';

export type ExcelImportAction = 'add' | 'remove';

export interface ParsedRow {
  fullName: string;
  studentId: string;
  email: string;
  _raw: Record<string, string>;
  _rowIndex: number;
}

export interface ImportValidation {
  row: ParsedRow;
  status: 'ok' | 'duplicate' | 'missing_field' | 'not_found';
  message?: string;
}

interface ExcelMemberImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExecute: (action: ExcelImportAction, rows: ParsedRow[]) => Promise<{ success: number; failed: number; errors: string[] }>;
  /** Validate rows before execution - return validation results */
  onValidate?: (action: ExcelImportAction, rows: ParsedRow[]) => Promise<ImportValidation[]>;
  /** Context label e.g. "hệ thống" or "project ABC" */
  contextLabel?: string;
  /** Allowed actions */
  allowedActions?: ExcelImportAction[];
}

type Step = 'upload' | 'mapping' | 'action' | 'confirm';

export default function ExcelMemberImport({
  open,
  onOpenChange,
  onExecute,
  onValidate,
  contextLabel = 'hệ thống',
  allowedActions = ['add', 'remove'],
}: ExcelMemberImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState('');
  const [sheetData, setSheetData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  
  // Column mapping
  const [nameCol, setNameCol] = useState<string>('');
  const [studentIdCol, setStudentIdCol] = useState<string>('');
  const [emailCol, setEmailCol] = useState<string>('');
  
  // Action
  const [action, setAction] = useState<ExcelImportAction>('add');
  
  // Validation & execution
  const [validations, setValidations] = useState<ImportValidation[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

  const reset = () => {
    setStep('upload');
    setFileName('');
    setSheetData([]);
    setHeaders([]);
    setNameCol('');
    setStudentIdCol('');
    setEmailCol('');
    setAction('add');
    setValidations([]);
    setIsValidating(false);
    setIsExecuting(false);
    setShowConfirmDialog(false);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

      if (json.length < 2) {
        return;
      }

      const hdrs = json[0].map((h, i) => String(h || `Cột ${i + 1}`));
      setHeaders(hdrs);
      setSheetData(json.slice(1).filter(row => row.some(cell => String(cell).trim())));

      // Auto-detect columns
      const lower = hdrs.map(h => h.toLowerCase());
      const nameIdx = lower.findIndex(h => h.includes('họ') || h.includes('tên') || h.includes('name') || h.includes('ho va ten'));
      const sidIdx = lower.findIndex(h => h.includes('mssv') || h.includes('mã') || h.includes('student') || h.includes('ma so'));
      const emailIdx = lower.findIndex(h => h.includes('email') || h.includes('mail'));

      if (nameIdx >= 0) setNameCol(hdrs[nameIdx]);
      if (sidIdx >= 0) setStudentIdCol(hdrs[sidIdx]);
      if (emailIdx >= 0) setEmailCol(hdrs[emailIdx]);

      setStep('mapping');
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const parsedRows: ParsedRow[] = sheetData.map((row, idx) => {
    const nameI = headers.indexOf(nameCol);
    const sidI = headers.indexOf(studentIdCol);
    const emailI = headers.indexOf(emailCol);
    const raw: Record<string, string> = {};
    headers.forEach((h, i) => { raw[h] = String(row[i] || ''); });
    return {
      fullName: nameI >= 0 ? String(row[nameI] || '').trim() : '',
      studentId: sidI >= 0 ? String(row[sidI] || '').trim() : '',
      email: emailI >= 0 ? String(row[emailI] || '').trim() : '',
      _raw: raw,
      _rowIndex: idx + 2, // Excel row number (1-indexed header + data)
    };
  }).filter(r => r.fullName || r.studentId || r.email);

  const isMappingValid = nameCol && studentIdCol && emailCol && nameCol !== studentIdCol && nameCol !== emailCol && studentIdCol !== emailCol;

  const handleProceedToAction = () => setStep('action');

  const handleProceedToConfirm = async () => {
    setStep('confirm');
    setIsValidating(true);
    
    if (onValidate) {
      const results = await onValidate(action, parsedRows);
      setValidations(results);
    } else {
      // Basic validation - check for missing fields
      setValidations(parsedRows.map(row => {
        if (!row.fullName && !row.studentId && !row.email) {
          return { row, status: 'missing_field', message: 'Thiếu tất cả thông tin' };
        }
        if (action === 'add' && (!row.fullName || !row.email)) {
          return { row, status: 'missing_field', message: `Thiếu ${!row.fullName ? 'họ tên' : 'email'}` };
        }
        return { row, status: 'ok' };
      }));
    }
    setIsValidating(false);
  };

  const validCount = validations.filter(v => v.status === 'ok').length;
  const errorCount = validations.filter(v => v.status !== 'ok').length;

  const handleExecute = async () => {
    setShowConfirmDialog(false);
    setIsExecuting(true);
    const validRows = validations.filter(v => v.status === 'ok').map(v => v.row);
    const res = await onExecute(action, validRows);
    setResult(res);
    setIsExecuting(false);
  };

  const actionLabel = action === 'add' ? 'Thêm' : 'Xóa';

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="w-[90vw] max-w-[1280px] h-[90vw*9/16] max-h-[720px] min-h-[400px] flex flex-col overflow-hidden" style={{ aspectRatio: '16/9', height: 'min(720px, calc(90vw * 9 / 16))' }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              Import danh sách từ Excel
            </DialogTitle>
            <DialogDescription>
              Tải lên file Excel để {allowedActions.includes('add') && 'thêm'}{allowedActions.length > 1 && '/'}{allowedActions.includes('remove') && 'xóa'} thành viên {contextLabel}
            </DialogDescription>
          </DialogHeader>

          {/* Steps indicator */}
          <div className="flex items-center gap-1 text-xs px-1">
            {(['upload', 'mapping', 'action', 'confirm'] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-1">
                {i > 0 && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
                <span className={`px-2 py-0.5 rounded-full ${step === s ? 'bg-primary text-primary-foreground font-medium' : 'text-muted-foreground'}`}>
                  {s === 'upload' ? '1. Tải file' : s === 'mapping' ? '2. Chọn cột' : s === 'action' ? '3. Thao tác' : '4. Xác nhận'}
                </span>
              </div>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
            {/* STEP 1: Upload */}
            {step === 'upload' && (
              <div className="flex-1 flex flex-col items-center justify-center py-12 gap-4">
                <div 
                  className="w-full max-w-sm border-2 border-dashed border-muted-foreground/30 rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                  <p className="font-medium">Kéo thả hoặc bấm để chọn file</p>
                  <p className="text-sm text-muted-foreground mt-1">.xlsx, .xls</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
            )}

            {/* STEP 2: Mapping */}
            {step === 'mapping' && (
              <div className="flex-1 flex flex-col gap-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span className="font-medium">{fileName}</span>
                  <Badge variant="secondary">{parsedRows.length} dòng</Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Họ và tên <span className="text-destructive">*</span></Label>
                    <Select value={nameCol} onValueChange={setNameCol}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Chọn cột" /></SelectTrigger>
                      <SelectContent>
                        {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">MSSV <span className="text-destructive">*</span></Label>
                    <Select value={studentIdCol} onValueChange={setStudentIdCol}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Chọn cột" /></SelectTrigger>
                      <SelectContent>
                        {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Email <span className="text-destructive">*</span></Label>
                    <Select value={emailCol} onValueChange={setEmailCol}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Chọn cột" /></SelectTrigger>
                      <SelectContent>
                        {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Preview table */}
                <div className="flex-1 border rounded-lg overflow-hidden flex flex-col min-h-0">
                  <div className="text-xs font-medium text-muted-foreground px-3 py-2 bg-muted/50 flex items-center gap-1.5 shrink-0">
                    <Table2 className="w-3.5 h-3.5" />
                    Xem trước (5 dòng đầu)
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b bg-muted/30">
                            <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">#</th>
                            {headers.map(h => (
                              <th key={h} className={`px-3 py-1.5 text-left font-medium whitespace-nowrap ${h === nameCol || h === studentIdCol || h === emailCol ? 'text-primary' : 'text-muted-foreground'}`}>
                                {h}
                                {h === nameCol && <span className="ml-1 text-[10px]">→ Tên</span>}
                                {h === studentIdCol && <span className="ml-1 text-[10px]">→ MSSV</span>}
                                {h === emailCol && <span className="ml-1 text-[10px]">→ Email</span>}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {sheetData.slice(0, 5).map((row, i) => (
                            <tr key={i} className="border-b last:border-0">
                              <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                              {headers.map((h, j) => (
                                <td key={j} className={`px-3 py-1.5 whitespace-nowrap ${h === nameCol || h === studentIdCol || h === emailCol ? 'font-medium' : ''}`}>
                                  {String(row[j] || '')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </ScrollArea>
                </div>
              </div>
            )}

            {/* STEP 3: Action */}
            {step === 'action' && (
              <div className="flex-1 flex flex-col gap-4 py-4">
                <p className="text-sm text-muted-foreground">
                  Đã đọc <span className="font-semibold text-foreground">{parsedRows.length}</span> bản ghi từ file. Chọn thao tác:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {allowedActions.includes('add') && (
                    <button
                      type="button"
                      onClick={() => setAction('add')}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${action === 'add' ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/30'}`}
                    >
                      <div className="flex items-center gap-2 font-semibold text-sm">
                        <CheckCircle2 className={`w-5 h-5 ${action === 'add' ? 'text-primary' : 'text-muted-foreground'}`} />
                        Thêm vào {contextLabel}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Tạo tài khoản mới hoặc thêm thành viên hiện có
                      </p>
                    </button>
                  )}
                  {allowedActions.includes('remove') && (
                    <button
                      type="button"
                      onClick={() => setAction('remove')}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${action === 'remove' ? 'border-destructive bg-destructive/5' : 'border-muted hover:border-destructive/30'}`}
                    >
                      <div className="flex items-center gap-2 font-semibold text-sm">
                        <XCircle className={`w-5 h-5 ${action === 'remove' ? 'text-destructive' : 'text-muted-foreground'}`} />
                        Xóa khỏi {contextLabel}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Xóa thành viên khớp MSSV hoặc email
                      </p>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* STEP 4: Confirm */}
            {step === 'confirm' && (
              <div className="flex-1 flex flex-col gap-3">
                {isValidating ? (
                  <div className="flex items-center justify-center py-12 gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Đang kiểm tra dữ liệu...</span>
                  </div>
                ) : result ? (
                  <div className="py-8 text-center space-y-3">
                    <CheckCircle2 className="w-12 h-12 mx-auto text-primary" />
                    <div>
                      <p className="font-semibold text-lg">Hoàn tất!</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Thành công: <span className="text-primary font-semibold">{result.success}</span>
                        {result.failed > 0 && <> · Thất bại: <span className="text-destructive font-semibold">{result.failed}</span></>}
                      </p>
                    </div>
                    {result.errors.length > 0 && (
                      <div className="text-left max-w-md mx-auto">
                        <p className="text-xs font-medium text-destructive mb-1">Chi tiết lỗi:</p>
                        <ScrollArea className="max-h-32">
                          {result.errors.map((err, i) => (
                            <p key={i} className="text-xs text-muted-foreground">• {err}</p>
                          ))}
                        </ScrollArea>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Summary */}
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {actionLabel} {validCount} thành viên {action === 'remove' ? 'khỏi' : 'vào'} {contextLabel}
                        </p>
                        {errorCount > 0 && (
                          <p className="text-xs text-destructive flex items-center gap-1 mt-0.5">
                            <AlertTriangle className="w-3 h-3" />
                            {errorCount} bản ghi có vấn đề (sẽ bị bỏ qua)
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Validation table */}
                    <ScrollArea className="flex-1 border rounded-lg min-h-0">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                          <tr className="border-b">
                            <th className="px-3 py-2 text-left w-8">#</th>
                            <th className="px-3 py-2 text-left">Họ tên</th>
                            <th className="px-3 py-2 text-left">MSSV</th>
                            <th className="px-3 py-2 text-left">Email</th>
                            <th className="px-3 py-2 text-left w-24">Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody>
                          {validations.map((v, i) => (
                            <tr key={i} className={`border-b last:border-0 ${v.status !== 'ok' ? 'bg-destructive/5' : ''}`}>
                              <td className="px-3 py-1.5 text-muted-foreground">{v.row._rowIndex}</td>
                              <td className="px-3 py-1.5 truncate max-w-32">{v.row.fullName}</td>
                              <td className="px-3 py-1.5">{v.row.studentId}</td>
                              <td className="px-3 py-1.5 truncate max-w-40">{v.row.email}</td>
                              <td className="px-3 py-1.5">
                                {v.status === 'ok' ? (
                                  <Badge variant="secondary" className="text-[10px] gap-0.5 bg-primary/10 text-primary">
                                    <CheckCircle2 className="w-2.5 h-2.5" /> OK
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive" className="text-[10px] gap-0.5">
                                    <AlertTriangle className="w-2.5 h-2.5" /> {v.message || v.status}
                                  </Badge>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </ScrollArea>
                  </>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="flex-row gap-2">
            {step !== 'upload' && !result && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (step === 'mapping') setStep('upload');
                  else if (step === 'action') setStep('mapping');
                  else if (step === 'confirm') setStep('action');
                }}
                disabled={isValidating || isExecuting}
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Quay lại
              </Button>
            )}
            <div className="flex-1" />
            {step === 'mapping' && (
              <Button size="sm" disabled={!isMappingValid} onClick={handleProceedToAction}>
                Tiếp tục
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            )}
            {step === 'action' && (
              <Button size="sm" onClick={handleProceedToConfirm}>
                Kiểm tra & Xác nhận
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            )}
            {step === 'confirm' && !result && !isValidating && (
              <Button
                size="sm"
                variant={action === 'remove' ? 'destructive' : 'default'}
                disabled={validCount === 0 || isExecuting}
                onClick={() => setShowConfirmDialog(true)}
              >
                {isExecuting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>{actionLabel} {validCount} thành viên</>
                )}
              </Button>
            )}
            {result && (
              <Button size="sm" onClick={() => handleClose(false)}>
                Đóng
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Final confirmation */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận {actionLabel.toLowerCase()} hàng loạt</AlertDialogTitle>
            <AlertDialogDescription>
              {action === 'add' ? (
                <>Bạn sắp thêm <span className="font-semibold">{validCount}</span> thành viên vào {contextLabel}. Mật khẩu mặc định cho tài khoản mới là <span className="font-mono font-bold">123456</span>.</>
              ) : (
                <>
                  Bạn sắp xóa <span className="font-semibold">{validCount}</span> thành viên khỏi {contextLabel}.
                  <br /><br />
                  <span className="text-destructive font-medium">Thao tác này không thể hoàn tác!</span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <Button
              onClick={handleExecute}
              className={action === 'remove' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              Xác nhận {actionLabel.toLowerCase()}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
