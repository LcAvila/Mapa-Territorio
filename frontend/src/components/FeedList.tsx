import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context-core';
import { Heart, MessageSquare, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Comment {
  id: number;
  content: string;
  sticker: string | null;
  createdAt: string;
  user: {
    id: number;
    full_name: string;
    username: string;
  };
}

interface Reaction {
  id: number;
  emoji: string;
  userId: number;
}

export interface Post {
  id: number;
  content: string;
  image: string | null;
  sticker: string | null;
  createdAt: string;
  user: {
    id: number;
    full_name: string;
    username: string;
    tipo: string;
  };
  comments: Comment[];
  reactions: Reaction[];
}

export default function FeedList({ refreshTrigger }: { refreshTrigger: number }) {
  const { token, userId } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    try {
      const tokenVersion = localStorage.getItem('tokenVersion') || '0';
      const res = await fetch('http://localhost:3001/api/feed', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-user-token-version': tokenVersion
        }
      });
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
      }
    } catch (error) {
      console.error('Erro ao buscar feed:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPosts();
  }, [refreshTrigger, fetchPosts]);

  const handleReact = async (postId: number, emoji: string) => {
    try {
      const res = await fetch('http://localhost:3001/api/feed/react', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ postId, emoji })
      });
      if (res.ok) {
        fetchPosts(); // Refresh for simplicity
      }
    } catch (e) {
      console.error('Erro ao reagir:', e);
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Carregando feed...</div>;

  if (posts.length === 0) return (
    <div className="bg-card border border-border/50 rounded-2xl p-10 text-center shadow-sm">
      <p className="text-muted-foreground">O feed está vazio. Seja o primeiro a postar algo!</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {posts.map(post => {
        const iLiked = post.reactions.some(r => r.userId === userId && r.emoji === '❤️');

        return (
          <div key={post.id} className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
                {post.user.full_name?.charAt(0) || 'U'}
              </div>
              <div>
                <h3 className="font-semibold text-sm leading-tight">{post.user.full_name}</h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <span className="capitalize">{post.user.tipo}</span>
                  •
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: ptBR })}</span>
                </div>
              </div>
            </div>

            <div className="text-sm my-3 whitespace-pre-wrap leading-relaxed">
              {post.content}
            </div>

            {post.sticker && (
              <img src={post.sticker} alt="Sticker" className="w-48 max-w-full rounded-xl my-3" />
            )}

            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border/50">
              <button 
                onClick={() => handleReact(post.id, '❤️')}
                className={`flex items-center gap-2 text-sm transition-colors ${iLiked ? 'text-red-500 font-medium' : 'text-muted-foreground hover:text-red-400'}`}
              >
                <Heart className={`w-4 h-4 ${iLiked ? 'fill-current' : ''}`} />
                <span>{post.reactions.filter(r => r.emoji === '❤️').length} curtidas</span>
              </button>
              
              <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                <MessageSquare className="w-4 h-4" />
                <span>{post.comments.length} comentários</span>
              </button>
            </div>

            {/* Simplistic Comment Display */}
            {post.comments.length > 0 && (
              <div className="mt-4 space-y-3 bg-secondary/20 p-4 rounded-xl">
                {post.comments.map(comment => (
                  <div key={comment.id} className="flex gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold shrink-0">
                      {comment.user.full_name?.charAt(0) || 'U'}
                    </div>
                    <div className="bg-background border border-border/30 px-3 py-2 rounded-2xl rounded-tl-sm text-sm">
                      <span className="font-semibold text-xs block mb-0.5">{comment.user.full_name}</span>
                      {comment.content}
                      {comment.sticker && <img src={comment.sticker} alt="Sticker" className="w-24 mt-2 rounded-md" />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
