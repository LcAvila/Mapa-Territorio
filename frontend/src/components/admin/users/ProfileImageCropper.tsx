import React, { useState, useCallback, useRef } from 'react';
import Cropper from 'react-easy-crop';
import { ZoomIn, ZoomOut, RotateCw, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { HexColorPicker } from 'react-colorful';

interface ProfileImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedImage: string, borderColor: string) => void;
  onCancel: () => void;
  initialBorderColor?: string;
}

const ProfileImageCropper: React.FC<ProfileImageCropperProps> = ({
  imageSrc,
  onCropComplete,
  onCancel,
  initialBorderColor = '#FFD700'
}) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [borderColor, setBorderColor] = useState(initialBorderColor);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const cropperRef = useRef<any>(null);

  const onCropChange = useCallback((crop: any) => {
    setCrop(crop);
  }, []);

  const onZoomChange = useCallback((zoom: number) => {
    setZoom(zoom);
  }, []);

  const onCropCompleteHandler = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = useCallback(async () => {
    if (!croppedAreaPixels || !cropperRef.current) return;

    const image = new Image();
    image.src = imageSrc;
    
    await new Promise((resolve) => {
      image.onload = resolve;
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    const size = croppedAreaPixels.width;
    canvas.width = size;
    canvas.height = size;

    // Draw circular clip
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.clip();

    // Draw image
    ctx.drawImage(
      image,
      croppedAreaPixels.x,
      croppedAreaPixels.y,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
      0,
      0,
      size,
      size
    );

    // Draw border
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = size * 0.05;
    ctx.stroke();

    const croppedImage = canvas.toDataURL('image/jpeg', 0.9);
    onCropComplete(croppedImage, borderColor);
  }, [croppedAreaPixels, imageSrc, borderColor, onCropComplete]);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.1, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.1, 1));
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-card rounded-2xl shadow-2xl max-w-2xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        <div className="p-4 sm:p-6 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold">Ajustar Foto de Perfil</h2>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={onCancel}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto flex-1 custom-scrollbar">
          {/* Crop Area */}
          <div className="relative w-full aspect-square max-h-[300px] sm:max-h-[400px] bg-muted/30 rounded-xl overflow-hidden border-2 border-border">
            <Cropper
              ref={cropperRef}
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={onCropChange}
              onZoomChange={onZoomChange}
              onCropComplete={onCropCompleteHandler}
              cropShape="round"
              showGrid={false}
              style={{
                containerStyle: {
                  width: '100%',
                  height: '100%',
                  backgroundColor: '#1a1a1a',
                },
              }}
            />
          </div>

          {/* Zoom Controls */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Zoom</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleZoomOut}
                  disabled={zoom <= 1}
                  className="h-8 w-8"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleZoomIn}
                  disabled={zoom >= 3}
                  className="h-8 w-8"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Slider
              value={[zoom]}
              onValueChange={(value) => setZoom(value[0])}
              min={1}
              max={3}
              step={0.1}
              className="w-full"
            />
          </div>

          {/* Border Color Selection */}
          <div className="space-y-3">
            <span className="text-sm font-medium">Cor da Borda</span>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-border flex-shrink-0">
                <HexColorPicker color={borderColor} onChange={setBorderColor} />
              </div>
              <div className="flex-1 grid grid-cols-4 sm:grid-cols-6 gap-2 w-full">
                {[
                  '#FFD700', // Gold
                  '#C0C0C0', // Silver
                  '#CD7F32', // Bronze
                  '#FF6B6B', // Red
                  '#4ECDC4', // Teal
                  '#45B7D1', // Blue
                  '#96CEB4', // Green
                  '#FFEAA7', // Yellow
                  '#DDA0DD', // Plum
                  '#87CEEB', // Sky Blue
                  '#FF69B4', // Hot Pink
                  '#000000', // Black
                ].map((color) => (
                  <button
                    key={color}
                    onClick={() => setBorderColor(color)}
                    className={`w-8 h-8 sm:w-8 sm:h-8 rounded-full border-2 transition-all ${
                      borderColor === color ? 'border-primary scale-110' : 'border-border hover:border-border/80'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-muted/30 rounded-xl">
            <div
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-4 flex-shrink-0"
              style={{ borderColor }}
            >
              <img
                src={imageSrc}
                alt="Preview"
                className="w-full h-full object-cover"
                style={{
                  transform: `scale(${zoom}) translate(${crop.x}px, ${crop.y}px)`,
                  transformOrigin: 'center',
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Pré-visualização</p>
              <p className="text-xs text-muted-foreground">Ajuste a posição e zoom para obter o melhor resultado</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2 sm:pt-4 flex-shrink-0">
            <Button
              variant="outline"
              onClick={onCancel}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1"
            >
              <Check className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileImageCropper;
