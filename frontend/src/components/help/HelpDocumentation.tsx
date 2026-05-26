import React, { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  BookOpen,
  ChevronRight,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ArrowUp,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  HELP_SECTIONS,
  HELP_FAQS,
  HELP_GLOSSARY,
  HELP_QUICK_LINKS,
  type HelpSection,
} from '@/data/help-content';
import { cn } from '@/lib/utils';

interface HelpDocumentationProps {
  /** Exibir barra superior compacta (dentro do Admin) */
  embedded?: boolean;
  className?: string;
}

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function SectionBlock({
  section,
  index,
}: {
  section: HelpSection;
  index: number;
}) {
  const Icon = section.icon;

  return (
    <motion.section
      id={section.id}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.45, delay: index * 0.04 }}
      className="scroll-mt-28"
    >
      <div className="flex items-start gap-4 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 shadow-sm">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight text-foreground">
            {section.title}
          </h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl leading-relaxed">
            {section.summary}
          </p>
        </div>
      </div>

      {section.intro && (
        <p className="text-sm md:text-base text-foreground/85 leading-relaxed mb-6 pl-1 border-l-2 border-primary/40 ml-1 pl-4">
          {section.intro}
        </p>
      )}

      {section.steps && section.steps.length > 0 && (
        <div className="space-y-3 mb-6">
          {section.steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="group flex gap-4 p-4 rounded-xl border border-border/60 bg-card/50 hover:bg-card/80 hover:border-primary/25 transition-all duration-300"
            >
              <div className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-black text-sm shrink-0 shadow-md shadow-primary/20 group-hover:scale-105 transition-transform">
                {i + 1}
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-foreground text-sm md:text-base mb-1">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {section.tips && section.tips.length > 0 && (
        <div className="mb-4 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 dark:bg-emerald-500/10">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-xs uppercase tracking-widest mb-2">
            <Lightbulb className="w-4 h-4" />
            Dica útil
          </div>
          <ul className="space-y-2">
            {section.tips.map((tip) => (
              <li key={tip} className="flex gap-2 text-sm text-foreground/80">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {section.warnings && section.warnings.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/25 dark:bg-amber-500/10">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs uppercase tracking-widest mb-2">
            <AlertTriangle className="w-4 h-4" />
            Atenção
          </div>
          <ul className="space-y-2">
            {section.warnings.map((w) => (
              <li key={w} className="text-sm text-foreground/85 leading-relaxed">
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.section>
  );
}

export const HelpDocumentation: React.FC<HelpDocumentationProps> = ({
  embedded = false,
  className,
}) => {
  const [search, setSearch] = useState('');
  const [activeSection, setActiveSection] = useState(HELP_SECTIONS[0].id);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollRootRef = useRef<HTMLDivElement>(null);

  const filteredSections = useMemo(() => {
    const q = normalize(search.trim());
    if (!q) return HELP_SECTIONS;
    return HELP_SECTIONS.filter((s) => {
      const blob = [
        s.title,
        s.summary,
        s.intro || '',
        ...(s.steps?.map((x) => `${x.title} ${x.description}`) || []),
        ...(s.tips || []),
        ...(s.warnings || []),
      ].join(' ');
      return normalize(blob).includes(q);
    });
  }, [search]);

  const filteredFaqs = useMemo(() => {
    const q = normalize(search.trim());
    if (!q) return HELP_FAQS;
    return HELP_FAQS.filter(
      (f) =>
        normalize(f.question).includes(q) || normalize(f.answer).includes(q)
    );
  }, [search]);

  const getScrollRoot = () =>
    embedded ? scrollRootRef.current : null;

  useEffect(() => {
    const root = embedded ? scrollRootRef.current : null;
    const target = root || window;
    const onScroll = () => {
      const top = root ? root.scrollTop : window.scrollY;
      setShowScrollTop(top > 400);
    };
    target.addEventListener('scroll', onScroll as EventListener, { passive: true });
    return () => target.removeEventListener('scroll', onScroll as EventListener);
  }, [embedded]);

  useEffect(() => {
    const root = getScrollRoot();
    const ids = filteredSections.map((s) => s.id);
    const observers: IntersectionObserver[] = [];

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveSection(id);
        },
        { root, rootMargin: '-20% 0px -55% 0px', threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    });

    const faq = document.getElementById('faq');
    if (faq) {
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveSection('faq');
        },
        { root, rootMargin: '-20% 0px -55% 0px', threshold: 0 }
      );
      obs.observe(faq);
      observers.push(obs);
    }

    return () => observers.forEach((o) => o.disconnect());
  }, [filteredSections, embedded]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const root = getScrollRoot();
    if (root) {
      const rootRect = root.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      root.scrollTo({
        top: root.scrollTop + elRect.top - rootRect.top - 12,
        behavior: 'smooth',
      });
    } else {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setActiveSection(id);
  };

  const scrollToTop = () => {
    const root = getScrollRoot();
    if (root) root.scrollTo({ top: 0, behavior: 'smooth' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div
      ref={embedded ? scrollRootRef : undefined}
      className={cn(
        'min-h-full bg-background text-foreground',
        !embedded && 'min-h-screen',
        embedded && 'h-full overflow-y-auto',
        className
      )}
    >
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-border/50">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-background to-background dark:from-primary/10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-80" />
        <motion.div
          className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-primary/20 blur-3xl"
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-primary/15 blur-3xl"
          animate={{ scale: [1.1, 1, 1.1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="relative max-w-6xl mx-auto px-4 md:px-8 py-10 md:py-14">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge
                variant="outline"
                className="mb-3 gap-1.5 font-bold uppercase text-[10px] tracking-widest border-primary/30 text-primary"
              >
                <Sparkles className="w-3 h-3" />
                Guia do usuário
              </Badge>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight flex items-center gap-3 flex-wrap">
                <BookOpen className="w-9 h-9 text-primary shrink-0" />
                Central de Ajuda
              </h1>
              <p className="text-muted-foreground mt-3 max-w-xl text-sm md:text-base leading-relaxed">
                Tudo explicado em linguagem simples — sem termos técnicos. Aprenda a usar o{' '}
                <strong className="text-foreground font-semibold">Mapa Território</strong> no seu dia a dia.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-2"
            >
              <ThemeToggle />
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="relative max-w-xl"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar: roteiro, mapa, cliente, senha..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-12 bg-background/80 backdrop-blur-md border-border/80 shadow-sm text-base"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="flex flex-wrap gap-2 mt-6"
          >
            {HELP_QUICK_LINKS.map((link, i) => {
              const LinkIcon = link.icon;
              return (
                <Button
                  key={link.sectionId}
                  variant="secondary"
                  size="sm"
                  className="gap-2 rounded-full font-semibold text-xs h-9 hover:bg-primary/10 hover:text-primary border border-border/50"
                  onClick={() => scrollToSection(link.sectionId)}
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  {link.label}
                </Button>
              );
            })}
          </motion.div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 md:py-12 flex flex-col lg:flex-row gap-8 lg:gap-12">
        {/* Sidebar TOC — desktop */}
        <aside className="hidden lg:block w-56 shrink-0">
          <div className="sticky top-24">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 px-2">
              Nesta página
            </p>
            <ScrollArea className="h-[calc(100vh-8rem)] pr-2">
              <nav className="space-y-0.5">
                {filteredSections.map((s) => {
                  const Icon = s.icon;
                  const active = activeSection === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => scrollToSection(s.id)}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-sm transition-all duration-200',
                        active
                          ? 'bg-primary/15 text-primary font-bold border border-primary/20'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{s.title}</span>
                      {active && (
                        <ChevronRight className="w-3.5 h-3.5 ml-auto shrink-0" />
                      )}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => scrollToSection('faq')}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-sm transition-all',
                    activeSection === 'faq'
                      ? 'bg-primary/15 text-primary font-bold'
                      : 'text-muted-foreground hover:bg-muted'
                  )}
                >
                  Perguntas frequentes
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('glossario')}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-sm transition-all',
                    activeSection === 'glossario'
                      ? 'bg-primary/15 text-primary font-bold'
                      : 'text-muted-foreground hover:bg-muted'
                  )}
                >
                  Glossário
                </button>
              </nav>
            </ScrollArea>
          </div>
        </aside>

        {/* Mobile section chips */}
        <div className="lg:hidden flex gap-2 overflow-x-auto pb-2 no-scrollbar -mx-1 px-1">
          {filteredSections.map((s) => (
            <Button
              key={s.id}
              variant={activeSection === s.id ? 'default' : 'outline'}
              size="sm"
              className="shrink-0 rounded-full text-xs font-bold"
              onClick={() => scrollToSection(s.id)}
            >
              {s.title}
            </Button>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-16 md:space-y-20">
          <AnimatePresence mode="wait">
            {filteredSections.length === 0 ? (
              <motion.p
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center text-muted-foreground py-16"
              >
                Nenhum resultado para &quot;{search}&quot;. Tente outras palavras como mapa, roteiro ou cliente.
              </motion.p>
            ) : (
              <motion.div
                key="sections"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-16 md:space-y-20"
              >
                {filteredSections.map((section, index) => (
                  <SectionBlock key={section.id} section={section} index={index} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* FAQ */}
          {(search === '' || filteredFaqs.length > 0) && (
            <motion.section
              id="faq"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="scroll-mt-28"
            >
              <h2 className="text-xl md:text-2xl font-black mb-2">Perguntas frequentes</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Respostas rápidas para as dúvidas mais comuns.
              </p>
              <Accordion type="single" collapsible className="space-y-2">
                {filteredFaqs.map((faq, i) => (
                  <AccordionItem
                    key={faq.question}
                    value={`faq-${i}`}
                    className="border border-border/60 rounded-xl px-4 bg-card/40 data-[state=open]:border-primary/30 data-[state=open]:bg-card/70 transition-colors"
                  >
                    <AccordionTrigger className="text-left font-bold text-sm hover:no-underline py-4">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.section>
          )}

          {/* Glossário */}
          {search === '' && (
            <motion.section
              id="glossario"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="scroll-mt-28"
            >
              <h2 className="text-xl md:text-2xl font-black mb-2">Glossário</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Significado das palavras usadas no sistema.
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {HELP_GLOSSARY.map((item, i) => (
                  <motion.div
                    key={item.term}
                    initial={{ opacity: 0, scale: 0.98 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <Card className="h-full border-border/50 bg-card/50 hover:border-primary/20 transition-colors">
                      <CardContent className="p-4">
                        <p className="font-black text-primary text-sm uppercase tracking-wide mb-1">
                          {item.term}
                        </p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {item.definition}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )}

          {/* Footer CTA */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 to-primary/5 p-6 md:p-8 text-center"
          >
            <p className="font-black text-lg text-foreground mb-2">Ainda com dúvidas?</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Entre em contato com o administrador do sistema na sua empresa ou com o suporte de TI.
              Eles podem liberar permissões, redefinir senha e ajudar com cadastros em lote.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Scroll to top */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            type="button"
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 z-50 w-11 h-11 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-105 transition-transform"
            aria-label="Voltar ao topo"
          >
            <ArrowUp className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HelpDocumentation;
