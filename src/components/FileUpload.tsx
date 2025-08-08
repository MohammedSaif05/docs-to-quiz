import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClearFile: () => void;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  selectedFile,
  onClearFile,
}) => {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0]);
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      onDrop,
      accept: {
        'application/pdf': ['.pdf'],
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
        'text/plain': ['.txt'],
      },
      maxFiles: 1,
    });

  if (selectedFile) {
    return (
      <Card className="p-6 shadow-card transition-smooth">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-success/10 rounded-lg">
              <Check className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="font-medium text-foreground">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFile}
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="shadow-card transition-smooth">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-smooth
          ${
            isDragActive && !isDragReject
              ? 'border-primary bg-primary-subtle'
              : isDragReject
              ? 'border-destructive bg-destructive/5'
              : 'border-border hover:border-primary hover:bg-primary-subtle/50'
          }
        `}
      >
        <input {...getInputProps()} />
        
        <div className="space-y-4">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
            {isDragActive ? (
              <Upload className="h-6 w-6 text-primary animate-bounce" />
            ) : (
              <FileText className="h-6 w-6 text-primary" />
            )}
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">
              {isDragActive
                ? isDragReject
                  ? 'File type not supported'
                  : 'Drop your file here'
                : 'Upload your document'}
            </h3>
            
            <p className="text-muted-foreground">
              {isDragReject
                ? 'Please upload a PDF, DOCX, or TXT file'
                : 'Drag & drop your PDF, DOCX, or TXT file here, or click to browse'}
            </p>
          </div>
          
          {!isDragActive && (
            <Button className="quiz-gradient">
              Choose File
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

export default FileUpload;