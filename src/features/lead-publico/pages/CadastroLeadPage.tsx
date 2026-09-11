import { useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, CheckCircle2, FileText, Upload, X } from 'lucide-react';
import { Button, buttonVariants } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { cn } from '@/shared/lib/utils';
import { toast, extrairMensagemDeErro } from '@/shared/components/ui/toast';
import {
  leadPublicoSchema,
  DOCUMENTOS_OBRIGATORIOS,
  type LeadPublicoFormInput,
  type LeadPublicoFormValues,
} from '../schemas/leadPublico.schema';
import { criarLeadPublico, enviarDocumentoLeadPublico, validarDocumento } from '../api/leadPublico';
import rodavoltLogo from '../assets/rodavolt-logo.svg';

// Página pública do funil: quem clica em "Quero alugar" / "Quero meu Carro Elétrico" na
// landing cai aqui, preenche o cadastro completo, anexa os documentos, e vira um motorista
// novo na etapa "Novo Lead" do Kanban (migration 0042) — sem precisar de login, porque essa
// pessoa ainda não é cliente.
//
// Visual: mesmo tema escuro/azul da landing (não o branco do /login — ali é pra quem já é
// motorista voltando pro portal; aqui é a continuação da página de marketing). Os campos
// Input/Label compartilhados têm variant dark: que reage ao tema do SO — sobrescritos aqui
// explicitamente pros dois lados (claro/escuro do SO) sempre renderizarem o mesmo visual
// escuro proposital da página (mesma lição do bug de campo preto no login).

const inputClass =
  'h-11 border-white/[0.15] bg-white/[0.05] text-[15px] text-white placeholder:text-zinc-500 dark:border-white/[0.15] dark:bg-white/[0.05] dark:text-white dark:placeholder:text-zinc-500 focus-visible:ring-[#2389FF] focus-visible:ring-offset-0';
const labelClass = 'mb-1.5 block text-xs font-medium text-zinc-400 dark:text-zinc-400';

type DocKey = (typeof DOCUMENTOS_OBRIGATORIOS)[number]['categoria'] | 'Outro';

function CampoDoc({
  label,
  obrigatorio,
  file,
  onSelect,
  onRemove,
}: {
  label: string;
  obrigatorio: boolean;
  file: File | null;
  onSelect: (file: File) => void;
  onRemove: () => void;
}) {
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      validarDocumento(f);
      onSelect(f);
    } catch (err) {
      toast.error(extrairMensagemDeErro(err));
    } finally {
      e.target.value = '';
    }
  }

  return (
    <div>
      <Label className={labelClass}>
        {label} {obrigatorio && <span className="text-[#FF4D4D]">*</span>}
      </Label>
      {file ? (
        <div className="flex items-center justify-between gap-2 rounded-md border border-white/[0.15] bg-white/[0.05] px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <FileText className="h-4 w-4 shrink-0 text-[#2389FF]" />
            <span className="truncate text-sm text-white">{file.name}</span>
          </div>
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remover arquivo"
            className="shrink-0 rounded p-1 text-zinc-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-white/[0.2] bg-white/[0.03] text-sm text-zinc-400 hover:border-[#2389FF] hover:text-white">
          <Upload className="h-4 w-4" />
          Selecionar arquivo
          <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={handleChange} />
        </label>
      )}
    </div>
  );
}

export function CadastroLeadPage() {
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [docs, setDocs] = useState<Partial<Record<DocKey, File>>>({});

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LeadPublicoFormInput, unknown, LeadPublicoFormValues>({
    resolver: zodResolver(leadPublicoSchema),
  });

  async function onSubmit(values: LeadPublicoFormValues) {
    // Honeypot: campo escondido (ver register('website') abaixo) — só bot preenche. Silencioso
    // de propósito: não avisa o bot de que foi pego, só finge sucesso e não faz nada.
    if (values.website) {
      setEnviado(true);
      return;
    }

    const faltando = DOCUMENTOS_OBRIGATORIOS.filter((d) => !docs[d.categoria]);
    if (faltando.length > 0) {
      toast.error('Documentos obrigatórios faltando', faltando.map((d) => d.label).join(', '));
      return;
    }

    setEnviando(true);
    try {
      const { motoristaId, empresaId } = await criarLeadPublico(values);

      for (const [categoria, file] of Object.entries(docs)) {
        if (!file) continue;
        await enviarDocumentoLeadPublico(file, categoria, empresaId, motoristaId);
      }

      setEnviado(true);
    } catch (err) {
      toast.error('Não foi possível concluir o cadastro', extrairMensagemDeErro(err));
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#05070B] px-6 py-10">
        <div className="w-full max-w-md text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-[#00E676]" />
          <h1 className="mt-5 text-2xl font-bold text-white">Cadastro recebido!</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Recebemos seus dados e documentos. Nossa equipe vai analisar seu cadastro e entrar em contato pelo
            telefone ou e-mail informados.
          </p>
          <Link
            to="/"
            className={cn(buttonVariants({ size: 'lg' }), 'mt-8 rounded-xl bg-[#2389FF] font-bold text-white hover:bg-[#1B6FDB]')}
          >
            Voltar ao site
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05070B] px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-2xl">
        <img src={rodavoltLogo} alt="RodaVolt" className="h-7 w-auto sm:h-8" />

        <h1 className="mt-6 text-2xl font-black text-white sm:text-3xl">Quero alugar meu carro elétrico</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Preencha seus dados e anexe os documentos abaixo. Nossa equipe analisa seu cadastro e entra em contato.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-8">
          {/* honeypot — invisível para humano, sem label, fora do fluxo de tab */}
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            className="pointer-events-none absolute h-0 w-0 opacity-0"
            aria-hidden="true"
            {...register('website')}
          />

          <section className="space-y-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6">
            <h2 className="text-sm font-semibold text-white">Seus dados</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label className={labelClass}>Nome completo *</Label>
                <Input className={inputClass} {...register('nome_completo')} />
                {errors.nome_completo && <p className="mt-1 text-xs text-[#FF4D4D]">{errors.nome_completo.message}</p>}
              </div>
              <div>
                <Label className={labelClass}>CPF *</Label>
                <Input className={inputClass} placeholder="000.000.000-00" {...register('cpf')} />
                {errors.cpf && <p className="mt-1 text-xs text-[#FF4D4D]">{errors.cpf.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <Label className={labelClass}>E-mail *</Label>
                <Input type="email" className={inputClass} {...register('email')} />
                {errors.email && <p className="mt-1 text-xs text-[#FF4D4D]">{errors.email.message}</p>}
              </div>
              <div>
                <Label className={labelClass}>Telefone / WhatsApp *</Label>
                <Input className={inputClass} placeholder="(11) 91234-5678" {...register('telefone')} />
                {errors.telefone && <p className="mt-1 text-xs text-[#FF4D4D]">{errors.telefone.message}</p>}
              </div>
              <div>
                <Label className={labelClass}>Data de nascimento *</Label>
                <Input type="date" className={inputClass} {...register('data_nascimento')} />
                {errors.data_nascimento && <p className="mt-1 text-xs text-[#FF4D4D]">{errors.data_nascimento.message}</p>}
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6">
            <h2 className="text-sm font-semibold text-white">CNH</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <Label className={labelClass}>Número *</Label>
                <Input className={inputClass} {...register('cnh_numero')} />
                {errors.cnh_numero && <p className="mt-1 text-xs text-[#FF4D4D]">{errors.cnh_numero.message}</p>}
              </div>
              <div>
                <Label className={labelClass}>Categoria *</Label>
                <Input className={inputClass} placeholder="AB" {...register('cnh_categoria')} />
                {errors.cnh_categoria && <p className="mt-1 text-xs text-[#FF4D4D]">{errors.cnh_categoria.message}</p>}
              </div>
              <div>
                <Label className={labelClass}>Validade *</Label>
                <Input type="date" className={inputClass} {...register('cnh_validade')} />
                {errors.cnh_validade && <p className="mt-1 text-xs text-[#FF4D4D]">{errors.cnh_validade.message}</p>}
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6">
            <h2 className="text-sm font-semibold text-white">Endereço</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div className="sm:col-span-2">
                <Label className={labelClass}>Endereço *</Label>
                <Input className={inputClass} {...register('endereco')} />
                {errors.endereco && <p className="mt-1 text-xs text-[#FF4D4D]">{errors.endereco.message}</p>}
              </div>
              <div>
                <Label className={labelClass}>Cidade *</Label>
                <Input className={inputClass} {...register('cidade')} />
                {errors.cidade && <p className="mt-1 text-xs text-[#FF4D4D]">{errors.cidade.message}</p>}
              </div>
              <div>
                <Label className={labelClass}>Estado *</Label>
                <Input className={inputClass} placeholder="UF" maxLength={2} {...register('estado')} />
                {errors.estado && <p className="mt-1 text-xs text-[#FF4D4D]">{errors.estado.message}</p>}
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6">
            <h2 className="text-sm font-semibold text-white">Documentos</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {DOCUMENTOS_OBRIGATORIOS.map((d) => (
                <CampoDoc
                  key={d.categoria}
                  label={d.label}
                  obrigatorio
                  file={docs[d.categoria] ?? null}
                  onSelect={(file) => setDocs((prev) => ({ ...prev, [d.categoria]: file }))}
                  onRemove={() => setDocs((prev) => ({ ...prev, [d.categoria]: undefined }))}
                />
              ))}
              <CampoDoc
                label="Outro documento (opcional)"
                obrigatorio={false}
                file={docs.Outro ?? null}
                onSelect={(file) => setDocs((prev) => ({ ...prev, Outro: file }))}
                onRemove={() => setDocs((prev) => ({ ...prev, Outro: undefined }))}
              />
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6">
            <h2 className="text-sm font-semibold text-white">Sobre o carro</h2>
            <div>
              <Label className={labelClass}>Qual carro você tem interesse? (opcional)</Label>
              <Input className={inputClass} placeholder="Ex.: modelo visto no comparador, ou 'sem preferência'" {...register('veiculoInteresse')} />
            </div>
            <div>
              <Label className={labelClass}>Observações (opcional)</Label>
              <Input className={inputClass} {...register('observacoes')} />
            </div>
          </section>

          <Button
            type="submit"
            disabled={enviando}
            className="h-12 w-full rounded-xl bg-[#2389FF] text-base font-bold text-white hover:bg-[#1B6FDB] focus-visible:ring-[#2389FF] focus-visible:ring-offset-0"
          >
            {enviando ? 'Enviando…' : 'Enviar cadastro'}
          </Button>
        </form>

        <Link to="/" className="mt-8 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300">
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar ao site
        </Link>
      </div>
    </div>
  );
}
