import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, ArrowLeft, BookOpen, Video, MessageSquare, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Ajuda = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6 gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <HelpCircle className="w-8 h-8 text-primary" />
            Central de Ajuda
          </h1>
          <p className="text-muted-foreground">
            Documentação e guias para usar o sistema Mapa Território
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <BookOpen className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Documentação</CardTitle>
              <CardDescription>
                Guia completo com todas as funcionalidades do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                Acessar Documentação
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <Video className="w-8 h-8 text-blue-500 mb-2" />
              <CardTitle>Tutoriais em Vídeo</CardTitle>
              <CardDescription>
                Vídeos passo a passo para aprender a usar o sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                Assistir Tutoriais
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <FileText className="w-8 h-8 text-green-500 mb-2" />
              <CardTitle>FAQ</CardTitle>
              <CardDescription>
                Perguntas frequentes e suas respostas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                Ver FAQ
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <MessageSquare className="w-8 h-8 text-orange-500 mb-2" />
              <CardTitle>Suporte</CardTitle>
              <CardDescription>
                Entre em contato com a equipe de suporte
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                Abrir Chamado
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 p-6 bg-secondary rounded-lg border border-border">
          <h2 className="text-lg font-semibold mb-2">Em construção</h2>
          <p className="text-muted-foreground text-sm">
            A página de documentação está em desenvolvimento. Em breve você terá acesso a guias completos, tutoriais e recursos para ajudar você a usar todas as funcionalidades do sistema.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Ajuda;
