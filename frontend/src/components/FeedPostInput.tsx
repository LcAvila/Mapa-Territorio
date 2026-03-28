import React, { useState, useRef, useEffect } from 'react';
import { Smile, Send, X, Sticker } from 'lucide-react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { GiphyFetch } from '@giphy/js-fetch-api';
import { Grid } from '@giphy/react-components';
import { useAuth } from '@/contexts/auth-context-core';
import { toast } from 'sonner';
import { Button } from './ui/button';

// Chave pública de testes do Giphy Docs
const gf = new GiphyFetch('sXpGFDGpz0Dv1VDJCjm8wSmM62402T6v'); 

export default function FeedPostInput({ onPostCreated, defaultText = "" }: { onPostCreated: () => void, defaultText?: string }) {
  const { token } = useAuth();
  const [content, setContent] = useState(defaultText);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGiphy, setShowGiphy] = useState(false);
  const [searchGiphy, setSearchGiphy] = useState('');
  const [selectedSticker, setSelectedSticker] = useState<{ url: string, type: 'gif' | 'sticker' } | null>(null);
  const [loading, setLoading] = useState(false);
  
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowEmoji(false);
        setShowGiphy(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePost = async () => {
    if (!content.trim() && !selectedSticker) return;

    setLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/feed/post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content,
          sticker: selectedSticker?.url
        })
      });

      if (res.ok) {
        setContent('');
        setSelectedSticker(null);
        setShowEmoji(false);
        setShowGiphy(false);
        toast.success('Publicado com sucesso!');
        onPostCreated();
      } else {
        toast.error('Erro ao publicar');
      }
    } catch (error) {
      toast.error('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  const fetchGifs = (offset: number) => {
    if (searchGiphy) {
      return gf.search(searchGiphy, { offset, limit: 10, type: 'stickers' });
    }
    return gf.trending({ offset, limit: 10, type: 'stickers' });
  };

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm relative">
      <textarea
        className="w-full bg-secondary/30 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none min-h-[80px]"
        placeholder="Compartilhe algo com a equipe..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />

      {selectedSticker && (
        <div className="relative inline-block mt-2 bg-secondary/20 p-2 rounded-xl">
          <img src={selectedSticker.url} alt="Sticker" className="h-24 object-contain rounded-md" />
          <button 
            onClick={() => setSelectedSticker(null)}
            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between mt-3">
        <div className="flex gap-2 relative" ref={pickerRef}>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => { setShowEmoji(!showEmoji); setShowGiphy(false); }}
            className={`text-muted-foreground hover:text-primary ${showEmoji ? 'bg-primary/10 text-primary' : ''}`}
          >
            <Smile className="w-4 h-4 mr-2" /> Emojis
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => { setShowGiphy(!showGiphy); setShowEmoji(false); }}
            className={`text-muted-foreground hover:text-primary ${showGiphy ? 'bg-primary/10 text-primary' : ''}`}
          >
            <Sticker className="w-4 h-4 mr-2" /> Figurinhas
          </Button>

          {showEmoji && (
            <div className="absolute top-10 left-0 z-50 shadow-2xl">
               <EmojiPicker 
                 onEmojiClick={(emoji) => setContent(prev => prev + emoji.emoji)}
                 theme={Theme.DARK} 
               />
            </div>
          )}

          {showGiphy && (
            <div className="absolute top-10 left-0 z-50 bg-card border border-border rounded-xl shadow-2xl w-[320px] overflow-hidden">
               <div className="p-2 border-b border-border">
                  <input 
                    type="text" 
                    placeholder="Buscar figurinhas..." 
                    className="w-full bg-secondary text-sm p-2 rounded-md focus:outline-none"
                    value={searchGiphy}
                    onChange={(e) => setSearchGiphy(e.target.value)}
                  />
               </div>
               <div className="h-[300px] overflow-y-auto p-1 custom-scrollbar">
                  <Grid 
                    width={300} 
                    columns={3} 
                    fetchGifs={fetchGifs} 
                    key={searchGiphy} // force re-render on search change
                    onGifClick={(gif, e) => {
                      e.preventDefault();
                      setSelectedSticker({ url: gif.images.fixed_height.url, type: 'sticker' });
                      setShowGiphy(false);
                    }} 
                  />
               </div>
            </div>
          )}
        </div>

        <Button 
          onClick={handlePost} 
          disabled={loading || (!content.trim() && !selectedSticker)}
          className="gap-2 rounded-full px-6"
        >
          {loading ? 'Enviando...' : (
             <>Publicar <Send className="w-4 h-4" /></>
          )}
        </Button>
      </div>
    </div>
  );
}
