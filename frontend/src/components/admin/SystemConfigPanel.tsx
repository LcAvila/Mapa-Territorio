import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Settings, Palette, LayoutDashboard, Grid3X3, Trash2, Upload, 
  ImageOff, RefreshCw, Save, Layers, Check, X 
} from 'lucide-react';

interface SystemConfigPanelProps {
  systemTab: 'visual' | 'sidebar' | 'buttons';
  setSystemTab: (tab: 'visual' | 'sidebar' | 'buttons') => void;
  brandLogo: string;
  handleLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveLogo: () => void;
  brandLogoHeightLogin: number;
  setBrandLogoHeightLogin: (val: number) => void;
  brandLogoHeightNavbar: number;
  setBrandLogoHeightNavbar: (val: number) => void;
  brandFavicon: string;
  handleFaviconUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveFavicon: () => void;
  brandNameDraft: string;
  setBrandNameDraft: (val: string) => void;
  handleSaveBrandName: () => void;
  brandSidebarColor: string;
  setBrandSidebarColor: (val: string) => void;
  brandSidebarTextColor: string;
  setBrandSidebarTextColor: (val: string) => void;
  brandSidebarTextActiveColor: string;
  setBrandSidebarTextActiveColor: (val: string) => void;
  brandSidebarHoverColor: string;
  setBrandSidebarHoverColor: (val: string) => void;
  brandSidebarActiveBgColor: string;
  setBrandSidebarActiveBgColor: (val: string) => void;
  brandSidebarParentActiveBgColor: string;
  setBrandSidebarParentActiveBgColor: (val: string) => void;
  handleSaveSidebarStyle: (key: string, value: string) => void;
  handleSaveSidebarStyleBatch: () => void;
  handleRemoveSidebarStyle: (key: string) => void;
  brandButtonBgColor: string;
  setBrandButtonBgColor: (val: string) => void;
  brandButtonTextColor: string;
  setBrandButtonTextColor: (val: string) => void;
  brandButtonHoverBgColor: string;
  setBrandButtonHoverBgColor: (val: string) => void;
  brandButtonHoverTextColor: string;
  setBrandButtonHoverTextColor: (val: string) => void;
}

export const SystemConfigPanel: React.FC<SystemConfigPanelProps> = ({
  systemTab,
  setSystemTab,
  brandLogo,
  handleLogoUpload,
  handleRemoveLogo,
  brandLogoHeightLogin,
  setBrandLogoHeightLogin,
  brandLogoHeightNavbar,
  setBrandLogoHeightNavbar,
  brandFavicon,
  handleFaviconUpload,
  handleRemoveFavicon,
  brandNameDraft,
  setBrandNameDraft,
  handleSaveBrandName,
  brandSidebarColor,
  setBrandSidebarColor,
  brandSidebarTextColor,
  setBrandSidebarTextColor,
  brandSidebarTextActiveColor,
  setBrandSidebarTextActiveColor,
  brandSidebarHoverColor,
  setBrandSidebarHoverColor,
  brandSidebarActiveBgColor,
  setBrandSidebarActiveBgColor,
  brandSidebarParentActiveBgColor,
  setBrandSidebarParentActiveBgColor,
  handleSaveSidebarStyle,
  handleSaveSidebarStyleBatch,
  handleRemoveSidebarStyle,
  brandButtonBgColor,
  setBrandButtonBgColor,
  brandButtonTextColor,
  setBrandButtonTextColor,
  brandButtonHoverBgColor,
  setBrandButtonHoverBgColor,
  brandButtonHoverTextColor,
  setBrandButtonHoverTextColor,
}) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Navegação de Sub-Abas */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 shadow-sm">
            <Settings className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-wider">Configurações do Sistema</h2>
            <p className="text-xs text-muted-foreground">Personalize a aparência e comportamento da plataforma.</p>
          </div>
        </div>

        <div className="flex items-center bg-secondary/30 p-1 rounded-xl border border-border/40 w-full sm:w-auto overflow-x-auto no-scrollbar">
          <button
            onClick={() => setSystemTab('visual')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${systemTab === 'visual' ? 'bg-background text-primary shadow-sm ring-1 ring-border/50' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Palette className="w-3.5 h-3.5" /> Identidade Visual
          </button>
          <button
            onClick={() => setSystemTab('sidebar')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${systemTab === 'sidebar' ? 'bg-background text-primary shadow-sm ring-1 ring-border/50' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" /> Sidebar
          </button>
          <button
            onClick={() => setSystemTab('buttons')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${systemTab === 'buttons' ? 'bg-background text-primary shadow-sm ring-1 ring-border/50' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Grid3X3 className="w-3.5 h-3.5" /> Botões
          </button>
        </div>
      </div>

      {/* Conteúdo da Sub-Aba: IDENTIDADE VISUAL */}
      {systemTab === 'visual' && (
        <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="border-border/40 bg-card/50 backdrop-blur-sm shadow-xl overflow-hidden">
            <CardHeader className="p-5 sm:p-6 border-b border-border/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/15 rounded-xl flex items-center justify-center shrink-0 border border-primary/20 shadow-inner">
                  <Palette className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-sm sm:text-base uppercase tracking-widest font-black">Identidade Visual</CardTitle>
                  <CardDescription className="text-[10px] sm:text-xs">Configure a logo, o favicon e o nome do seu sistema.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Logo Section */}
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-black text-foreground uppercase tracking-wider">Logo da Empresa</label>
                      <p className="text-[9px] text-muted-foreground leading-relaxed">Menu lateral e login.</p>
                    </div>

                    <div className="flex flex-col items-center gap-3">
                      <div className="w-full aspect-video max-w-[180px] rounded-xl border-2 border-dashed border-border/60 flex items-center justify-center bg-secondary/20 relative overflow-hidden group shadow-inner">
                        {brandLogo ? (
                          <>
                            <img src={brandLogo} alt="Logo" className="w-full h-full object-contain p-3 transition-transform group-hover:scale-110 duration-500" />
                            <div className="absolute inset-0 bg-background/90 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-sm">
                              <Button variant="destructive" size="icon" className="w-8 h-8 rounded-full shadow-lg shadow-destructive/20" onClick={handleRemoveLogo} title="Remover Logo">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </>
                        ) : (
                          <div className="text-center p-3">
                            <ImageOff className="w-5 h-5 text-muted-foreground/30 mx-auto mb-1" />
                            <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-40">Sem Logo</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="w-full">
                        <input type="file" id="logo-upload-sys" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="w-full gap-2 h-9 border-primary/20 hover:border-primary/50 hover:bg-primary/5 font-bold transition-all text-[10px] uppercase tracking-wider" 
                          onClick={() => document.getElementById('logo-upload-sys')?.click()}
                        >
                          <Upload className="w-3 h-3" /> Enviar Logo
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Ajuste de Tamanhos da Logo */}
                  <div className="p-4 rounded-xl bg-secondary/20 border border-border/40 space-y-5">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-foreground">Tamanho: Tela de Login</Label>
                        <span className="text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-md font-bold">{brandLogoHeightLogin}px</span>
                      </div>
                      <input 
                        type="range" min="40" max="300" step="5"
                        value={brandLogoHeightLogin} 
                        onChange={(e) => setBrandLogoHeightLogin(Number(e.target.value))} 
                        className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-primary" 
                      />
                      <p className="text-[8px] text-muted-foreground leading-tight italic">Ajusta a altura da logo centralizada na página de entrada.</p>
                    </div>

                    <div className="h-px bg-border/40" />

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-foreground">Tamanho: Navbar</Label>
                        <span className="text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-md font-bold">{brandLogoHeightNavbar}px</span>
                      </div>
                      <input 
                        type="range" min="20" max="80" step="2"
                        value={brandLogoHeightNavbar} 
                        onChange={(e) => setBrandLogoHeightNavbar(Number(e.target.value))} 
                        className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-primary" 
                      />
                      <p className="text-[8px] text-muted-foreground leading-tight italic">Ajusta a altura da logo que aparece no topo do menu lateral.</p>
                    </div>
                  </div>
                </div>

                {/* Favicon Section */}
                <div className="space-y-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-black text-foreground uppercase tracking-wider">Favicon do Sistema</label>
                    <p className="text-[9px] text-muted-foreground leading-relaxed">Ícone da aba do navegador.</p>
                  </div>

                  <div className="flex flex-col items-center gap-3">
                    <div className="w-full aspect-video max-w-[180px] rounded-xl border-2 border-dashed border-border/60 flex items-center justify-center bg-secondary/20 relative overflow-hidden group shadow-inner">
                      <img 
                        src={brandFavicon} 
                        alt="Favicon Preview" 
                        className="w-12 h-12 object-contain transition-transform group-hover:scale-110"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/favicon.ico' }}
                      />
                      <div className="absolute inset-0 bg-background/90 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-sm">
                        {brandFavicon !== '/favicon.ico' && (
                          <Button variant="destructive" size="icon" className="w-8 h-8 rounded-full shadow-lg shadow-destructive/20" onClick={handleRemoveFavicon} title="Resetar Favicon">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="w-full">
                      <input type="file" id="favicon-upload-sys" accept="image/*" className="hidden" onChange={handleFaviconUpload} />
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="w-full gap-2 h-9 border-primary/20 hover:border-primary/50 hover:bg-primary/5 font-bold transition-all text-[10px] uppercase tracking-wider" 
                        onClick={() => document.getElementById('favicon-upload-sys')?.click()}
                      >
                        <Upload className="w-3 h-3" /> Mudar Favicon
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Name Section */}
                <div className="space-y-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-black text-foreground uppercase tracking-wider">Nome do Sistema</label>
                    <p className="text-[9px] text-muted-foreground leading-relaxed">Título da aba e identificação.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex flex-col gap-3">
                      <Input 
                        value={brandNameDraft}
                        onChange={(e) => setBrandNameDraft(e.target.value)}
                        placeholder="Mapa Território"
                        className="h-10 text-xs sm:text-sm bg-background/50 border-border focus:ring-primary/20"
                      />
                      <Button 
                        size="sm"
                        className="gap-2 h-10 font-black uppercase tracking-widest text-[10px]"
                        onClick={handleSaveBrandName}
                      >
                        <Save className="w-3.5 h-3.5" /> Salvar Nome
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* SIDEBAR TAB */}
      {systemTab === 'sidebar' && (
        <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="border-border/40 bg-card/50 backdrop-blur-sm shadow-xl overflow-hidden">
            <CardHeader className="p-5 sm:p-6 border-b border-border/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/15 rounded-xl flex items-center justify-center shrink-0 border border-primary/20 shadow-inner">
                    <LayoutDashboard className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-sm sm:text-base uppercase tracking-widest font-black">Estilos da Sidebar</CardTitle>
                    <CardDescription className="text-[10px] sm:text-xs">Personalize cores de fundo, texto e estados de seleção.</CardDescription>
                  </div>
                </div>
                <Button onClick={handleSaveSidebarStyleBatch} className="gap-2 h-9 px-6 font-black uppercase tracking-widest shadow-lg shadow-primary/20 text-[10px]">
                  <Save className="w-3.5 h-3.5" /> Salvar Estilos
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-8">
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <Palette className="w-3.5 h-3.5 text-primary" /> Fundo Principal
                    </Label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { name: 'Padrão (verde)', color: '#155e21' },
                        { name: 'Amarelo Compactor', color: '#FFCC00' },
                        { name: 'Vermelho Compactor', color: '#E4002B' },
                        { name: 'Azul Compactor', color: '#0057B8' },
                        { name: 'Oceano', color: '#155e75' },
                        { name: 'Floresta', color: '#065f46' },
                        { name: 'Índigo', color: '#3730a3' },
                        { name: 'Coral', color: '#ea580c' },
                        { name: 'Roxo', color: '#5b21b6' },
                        { name: 'Noite', color: '#0f172a' },
                        { name: 'Grafite', color: '#334155' },
                        { name: 'Ardósia', color: '#1e293b' },
                      ].map(item => (
                        <button
                          key={item.color}
                          type="button"
                          onClick={() => handleSaveSidebarStyle('brand_sidebar_color', item.color)}
                          className={`group relative w-5 h-5 shrink-0 rounded-sm transition-all hover:scale-105 flex items-center justify-center ${brandSidebarColor === item.color ? 'ring-1 ring-primary ring-offset-1 ring-offset-background' : 'hover:ring-1 hover:ring-border'}`}
                          style={{ backgroundColor: item.color }}
                          title={item.name}
                        >
                          {brandSidebarColor === item.color && <Check className={`w-2.5 h-2.5 ${item.color === '#FFCC00' ? 'text-black/70' : 'text-white'}`} />}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 pt-2">
                      <Input type="color" value={brandSidebarColor?.startsWith('#') ? brandSidebarColor : '#155e21'} onChange={e => handleSaveSidebarStyle('brand_sidebar_color', e.target.value)} className="w-10 h-10 p-1 bg-background border-border rounded-lg cursor-pointer shadow-sm" />
                      <div className="flex-1 relative">
                        <Input type="text" value={brandSidebarColor} onChange={e => setBrandSidebarColor(e.target.value)} placeholder="HEX, RGB ou RGBA" className="h-10 font-mono text-xs uppercase bg-background/50 border-border/60" />
                        {brandSidebarColor && <button onClick={() => handleRemoveSidebarStyle('brand_sidebar_color')} className="absolute right-3 top-1/2 -translate-y-1/2 text-destructive hover:opacity-70"><Trash2 className="w-3.5 h-3.5" /></button>}
                      </div>
                    </div>
                  </div>
                  <div className="h-px bg-border/20" />
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-primary" /> Fundo: Aba Pai Ativa
                    </Label>
                    <div className="flex items-center gap-3">
                      <Input type="color" value={brandSidebarParentActiveBgColor?.startsWith('#') ? brandSidebarParentActiveBgColor : '#1a7a2a'} onChange={e => handleSaveSidebarStyle('brand_sidebar_parent_active_bg_color', e.target.value)} className="w-10 h-10 p-1 bg-background border-border rounded-lg cursor-pointer shadow-sm" />
                      <div className="flex-1 relative">
                        <Input type="text" value={brandSidebarParentActiveBgColor} onChange={e => setBrandSidebarParentActiveBgColor(e.target.value)} placeholder="Ex: rgba(255, 255, 255, 0.1)" className="h-10 font-mono text-xs uppercase bg-background/50 border-border/60" />
                        {brandSidebarParentActiveBgColor && <button onClick={() => handleRemoveSidebarStyle('brand_sidebar_parent_active_bg_color')} className="absolute right-3 top-1/2 -translate-y-1/2 text-destructive hover:opacity-70"><Trash2 className="w-3.5 h-3.5" /></button>}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-6 bg-secondary/10 p-5 rounded-2xl border border-border/40">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-foreground">Cor do Texto</Label>
                      <div className="flex gap-2">
                        <Input type="color" value={brandSidebarTextColor?.startsWith('#') ? brandSidebarTextColor : '#ffffff'} onChange={e => handleSaveSidebarStyle('brand_sidebar_text_color', e.target.value)} className="w-9 h-9 p-1 bg-background border-border rounded-lg cursor-pointer shadow-sm" />
                        <div className="relative flex-1">
                          <Input type="text" value={brandSidebarTextColor} onChange={e => setBrandSidebarTextColor(e.target.value)} placeholder="Texto Base" className="h-9 text-[10px] uppercase bg-background border-border/60 pr-8" />
                          {brandSidebarTextColor && <button onClick={() => handleRemoveSidebarStyle('brand_sidebar_text_color')} className="absolute right-2 top-1/2 -translate-y-1/2 text-destructive hover:opacity-70"><X className="w-3 h-3" /></button>}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-foreground">Texto Selecionado</Label>
                      <div className="flex gap-2">
                        <Input type="color" value={brandSidebarTextActiveColor?.startsWith('#') ? brandSidebarTextActiveColor : '#ffffff'} onChange={e => handleSaveSidebarStyle('brand_sidebar_text_active_color', e.target.value)} className="w-9 h-9 p-1 bg-background border-border rounded-lg cursor-pointer shadow-sm" />
                        <div className="relative flex-1">
                          <Input type="text" value={brandSidebarTextActiveColor} onChange={e => setBrandSidebarTextActiveColor(e.target.value)} placeholder="Texto Ativo" className="h-9 text-[10px] uppercase bg-background border-border/60 pr-8" />
                          {brandSidebarTextActiveColor && <button onClick={() => handleRemoveSidebarStyle('brand_sidebar_text_active_color')} className="absolute right-2 top-1/2 -translate-y-1/2 text-destructive hover:opacity-70"><X className="w-3 h-3" /></button>}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-foreground">Fundo do Hover</Label>
                      <div className="flex gap-2">
                        <Input type="color" value={brandSidebarHoverColor?.startsWith('#') ? brandSidebarHoverColor : '#ffffff'} onChange={e => handleSaveSidebarStyle('brand_sidebar_hover_color', e.target.value)} className="w-9 h-9 p-1 bg-background border-border rounded-lg cursor-pointer shadow-sm" />
                        <div className="relative flex-1">
                          <Input type="text" value={brandSidebarHoverColor} onChange={e => setBrandSidebarHoverColor(e.target.value)} placeholder="Hover BG" className="h-9 text-[10px] uppercase bg-background border-border/60 pr-8" />
                          {brandSidebarHoverColor && <button onClick={() => handleRemoveSidebarStyle('brand_sidebar_hover_color')} className="absolute right-2 top-1/2 -translate-y-1/2 text-destructive hover:opacity-70"><X className="w-3 h-3" /></button>}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-foreground">Fundo Selecionado</Label>
                      <div className="flex gap-2">
                        <Input type="color" value={brandSidebarActiveBgColor?.startsWith('#') ? brandSidebarActiveBgColor : '#ffffff'} onChange={e => handleSaveSidebarStyle('brand_sidebar_active_bg_color', e.target.value)} className="w-9 h-9 p-1 bg-background border-border rounded-lg cursor-pointer shadow-sm" />
                        <div className="relative flex-1">
                          <Input type="text" value={brandSidebarActiveBgColor} onChange={e => setBrandSidebarActiveBgColor(e.target.value)} placeholder="Ativo BG" className="h-9 text-[10px] uppercase bg-background border-border/60 pr-8" />
                          {brandSidebarActiveBgColor && <button onClick={() => handleRemoveSidebarStyle('brand_sidebar_active_bg_color')} className="absolute right-2 top-1/2 -translate-y-1/2 text-destructive hover:opacity-70"><X className="w-3 h-3" /></button>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* BUTTONS TAB */}
      {systemTab === 'buttons' && (
        <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="border-border/40 bg-card/50 backdrop-blur-sm shadow-xl overflow-hidden">
            <CardHeader className="p-5 sm:p-6 border-b border-border/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/15 rounded-xl flex items-center justify-center shrink-0 border border-primary/20 shadow-inner">
                    <Grid3X3 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-sm sm:text-base uppercase tracking-widest font-black">Estilos de Botões</CardTitle>
                    <CardDescription className="text-[10px] sm:text-xs">Configure as cores globais dos botões de ação.</CardDescription>
                  </div>
                </div>
                <Button onClick={handleSaveSidebarStyleBatch} className="gap-2 h-9 px-6 font-black uppercase tracking-widest shadow-lg shadow-primary/20 text-[10px]">
                  <Save className="w-3.5 h-3.5" /> Salvar Botões
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest">Fundo Base</Label>
                  <div className="flex gap-2">
                    <Input type="color" value={brandButtonBgColor?.startsWith('#') ? brandButtonBgColor : '#3b82f6'} onChange={e => handleSaveSidebarStyle('brand_button_bg_color', e.target.value)} className="w-10 h-10 p-1 bg-background border-border rounded-lg cursor-pointer shadow-sm" />
                    <Input type="text" value={brandButtonBgColor} onChange={e => setBrandButtonBgColor(e.target.value)} placeholder="#HEX" className="h-10 text-[10px] uppercase bg-background border-border/60" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest">Texto Base</Label>
                  <div className="flex gap-2">
                    <Input type="color" value={brandButtonTextColor?.startsWith('#') ? brandButtonTextColor : '#ffffff'} onChange={e => handleSaveSidebarStyle('brand_button_text_color', e.target.value)} className="w-10 h-10 p-1 bg-background border-border rounded-lg cursor-pointer shadow-sm" />
                    <Input type="text" value={brandButtonTextColor} onChange={e => setBrandButtonTextColor(e.target.value)} placeholder="#HEX" className="h-10 text-[10px] uppercase bg-background border-border/60" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest">Fundo Hover</Label>
                  <div className="flex gap-2">
                    <Input type="color" value={brandButtonHoverBgColor?.startsWith('#') ? brandButtonHoverBgColor : '#2563eb'} onChange={e => handleSaveSidebarStyle('brand_button_hover_bg_color', e.target.value)} className="w-10 h-10 p-1 bg-background border-border rounded-lg cursor-pointer shadow-sm" />
                    <Input type="text" value={brandButtonHoverBgColor} onChange={e => setBrandButtonHoverBgColor(e.target.value)} placeholder="#HEX" className="h-10 text-[10px] uppercase bg-background border-border/60" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest">Texto Hover</Label>
                  <div className="flex gap-2">
                    <Input type="color" value={brandButtonHoverTextColor?.startsWith('#') ? brandButtonHoverTextColor : '#ffffff'} onChange={e => handleSaveSidebarStyle('brand_button_hover_text_color', e.target.value)} className="w-10 h-10 p-1 bg-background border-border rounded-lg cursor-pointer shadow-sm" />
                    <Input type="text" value={brandButtonHoverTextColor} onChange={e => setBrandButtonHoverTextColor(e.target.value)} placeholder="#HEX" className="h-10 text-[10px] uppercase bg-background border-border/60" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
