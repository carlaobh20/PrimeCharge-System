import { useState, type ChangeEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, CheckCircle2, FileText, Mail, ShieldCheck, Upload, X } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select } from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';
import { cn } from '@/shared/lib/utils';
import { toast, extrairMensagemDeErro } from '@/shared/components/ui/toast';
import {
  leadPublicoSchema,
  DOCUMENTOS_OBRIGATORIOS,
  APPS_MOTORISTA,
  type LeadPublicoFormInput,
  type LeadPublicoFormValues,
} from '../schemas/leadPublico.schema';
import { criarLeadPublico, enviarDocumentoLeadPublico, validarDocumento } from '../api/leadPublico';
import rodavoltLogo from '../assets/rodavolt-logo-preto.svg';
import motoristaPhoto from '../assets/motorista-login.jpg';

// Página pública do funil: quem clica em "Quero alugar" / "Quero meu Carro Elétrico" na
// landing cai aqui, preenche a ficha de triagem completa (Carlos: "não podemos errar na
// contratação" — por isso o formulário é bem maior que o cadastro básico interno), anexa os
// documentos, e vira um motorista novo na etapa "Novo Lead" do Kanban (migration 0053).
//
// Visual replica o mockup de referência que o Carlos aprovou: tema claro (não o escuro da
// landing), faixa escura de destaque no topo, coluna esquerda com foto + "como funciona" +
// selo de confiança, coluna direita com o formulário em seções numeradas. Os campos
// Input/Select/Textarea compartilhados têm variant dark: que reage ao tema do SO —
// sobrescritos aqui explicitamente pros dois lados sempre renderizarem claro (mesma lição do
// bug de campo preto no /login).

const fieldClass =
  'h-11 border-neutral-300 bg-white text-[15px] text-neutral-900 placeholder:text-neutral-400 dark:border-neutral-300 dark:bg-white dark:text-neutral-900 dark:placeholder:text-neutral-400 focus-visible:ring-[#2389FF] focus-visible:ring-offset-0';
const labelClass = 'mb-1.5 block text-xs font-medium text-neutral-600 dark:text-neutral-600';

function SectionHeader({ numero, titulo }: { numero: string; titulo: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2389FF] text-sm font-bold text-white">
        {numero}
      </span>
      <h2 className="text-base font-bold text-neutral-900">{titulo}</h2>
    </div>
  );
}

function Campo({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <Label className={labelClass}>{label}</Label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

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
        {label} {obrigatorio && <span className="text-red-600">*</span>}
      </Label>
      {file ? (
        <div className="flex items-center justify-between gap-2 rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <FileText className="h-4 w-4 shrink-0 text-[#2389FF]" />
            <span className="truncate text-sm text-neutral-800">{file.name}</span>
          </div>
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remover arquivo"
            className="shrink-0 rounded p-1 text-neutral-400 hover:text-neutral-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-neutral-300 bg-neutral-50 text-sm text-neutral-500 hover:border-[#2389FF] hover:text-[#2389FF]">
          <Upload className="h-4 w-4" />
          Selecionar arquivo
          <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={handleChange} />
        </label>
      )}
    </div>
  );
}

const COMO_FUNCIONA = [
  { titulo: 'Envie seus dados', desc: 'Preencha o formulário completo e anexe seus documentos.' },
  { titulo: 'Aguarde nossa análise', desc: 'Nossa equipe confere seus dados e documentos com atenção.' },
  { titulo: 'Após aprovação, combine a retirada', desc: 'Com tudo certo, combinamos os próximos passos para você pegar seu carro.' },
];

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
    defaultValues: { apps_utilizados: [] },
  });

  async function onSubmit(values: LeadPublicoFormValues) {
    // Honeypot: campo escondido (register('website') mais abaixo) — só bot preenche.
    // Silencioso de propósito: finge sucesso, não salva nada.
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
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-6 py-10">
        <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
          <CheckCircle2 className="mx-auto h-12 w-12 text-[#00C076]" />
          <h1 className="mt-5 text-2xl font-bold text-neutral-900">Cadastro recebido!</h1>
          <p className="mt-2 text-sm text-neutral-500">
            Recebemos seus dados e documentos. Nossa equipe vai analisar seu cadastro e entrar em contato pelo
            telefone ou e-mail informados.
          </p>
          <Link
            to="/"
            className={cn(
              'mt-8 inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#2389FF] px-6 font-bold text-white hover:bg-[#1B6FDB]'
            )}
          >
            Voltar ao site
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <img src={rodavoltLogo} alt="RodaVolt" className="h-6 w-auto sm:h-7" />
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-[#2389FF] hover:underline">
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar ao site
          </Link>
        </div>
      </header>

      <div className="bg-[#05070B] px-4 py-10 sm:px-8 sm:py-14">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-bold uppercase tracking-widest text-[#2389FF]">Seu próximo passo</p>
          <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">Quero alugar meu carro elétrico</h1>
          <p className="mt-2 max-w-xl text-sm text-zinc-400">
            Preencha seus dados para nossa equipe conhecer você.
          </p>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[360px_1fr]">
          {/* Coluna esquerda */}
          <div className="space-y-6 lg:sticky lg:top-8 lg:self-start">
            <div className="relative overflow-hidden rounded-2xl">
              <img src={motoristaPhoto} alt="Motorista sorridente com o app RodaVolt no celular" className="h-64 w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                <p className="text-lg font-bold">Mais que um carro, uma nova oportunidade.</p>
                <p className="mt-1 text-sm text-zinc-300">Dirija o futuro com a RodaVolt.</p>
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">Como funciona</p>
              <div className="mt-4 space-y-4">
                {COMO_FUNCIONA.map((passo, i) => (
                  <div key={passo.titulo} className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2389FF] text-sm font-bold text-white">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">{passo.titulo}</p>
                      <p className="text-sm text-neutral-500">{passo.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[#2389FF]/20 bg-[#2389FF]/5 p-5">
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-6 w-6 shrink-0 text-[#2389FF]" />
                <div>
                  <p className="text-sm font-bold text-neutral-900">Cadastro para análise</p>
                  <p className="mt-1 text-sm text-neutral-600">
                    O envio não libera acesso ao app. O login de motorista é exclusivo para aprovados que já estão
                    rodando com a RodaVolt.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Coluna direita — formulário */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-8">
            <h2 className="text-xl font-black text-neutral-900">Vamos conhecer você</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Preencha os dados abaixo com atenção — quanto mais completo, mais rápida a nossa análise.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-10">
              {/* honeypot — invisível para humano */}
              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                className="pointer-events-none absolute h-0 w-0 opacity-0"
                aria-hidden="true"
                {...register('website')}
              />

              <section>
                <SectionHeader numero="01" titulo="Seus dados" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Campo label="Nome completo *" error={errors.nome_completo?.message}>
                    <Input className={fieldClass} {...register('nome_completo')} />
                  </Campo>
                  <Campo label="CPF *" error={errors.cpf?.message}>
                    <Input className={fieldClass} placeholder="000.000.000-00" {...register('cpf')} />
                  </Campo>
                  <Campo label="RG">
                    <Input className={fieldClass} {...register('rg')} />
                  </Campo>
                  <Campo label="Data de nascimento *" error={errors.data_nascimento?.message}>
                    <Input type="date" className={fieldClass} {...register('data_nascimento')} />
                  </Campo>
                  <Campo label="Estado civil">
                    <Select className={fieldClass} defaultValue="" {...register('estado_civil')}>
                      <option value="">Selecione</option>
                      <option value="solteiro">Solteiro(a)</option>
                      <option value="casado">Casado(a) / União estável</option>
                      <option value="divorciado">Divorciado(a)</option>
                      <option value="viuvo">Viúvo(a)</option>
                      <option value="outro">Outro</option>
                    </Select>
                  </Campo>
                  <Campo label="WhatsApp *" error={errors.telefone?.message}>
                    <Input className={fieldClass} placeholder="(11) 91234-5678" {...register('telefone')} />
                  </Campo>
                  <Campo label="E-mail *" error={errors.email?.message}>
                    <Input type="email" className={fieldClass} {...register('email')} />
                  </Campo>
                </div>
              </section>

              <section>
                <SectionHeader numero="02" titulo="Endereço" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                  <Campo label="CEP">
                    <Input className={fieldClass} placeholder="00000-000" {...register('cep')} />
                  </Campo>
                  <div className="sm:col-span-2">
                    <Campo label="Endereço *" error={errors.endereco?.message}>
                      <Input className={fieldClass} {...register('endereco')} />
                    </Campo>
                  </div>
                  <Campo label="Número">
                    <Input className={fieldClass} {...register('numero')} />
                  </Campo>
                  <Campo label="Complemento">
                    <Input className={fieldClass} {...register('complemento')} />
                  </Campo>
                  <Campo label="Bairro">
                    <Input className={fieldClass} {...register('bairro')} />
                  </Campo>
                  <Campo label="Cidade *" error={errors.cidade?.message}>
                    <Input className={fieldClass} {...register('cidade')} />
                  </Campo>
                  <Campo label="Estado *" error={errors.estado?.message}>
                    <Input className={fieldClass} placeholder="UF" maxLength={2} {...register('estado')} />
                  </Campo>
                </div>
              </section>

              <section>
                <SectionHeader numero="03" titulo="CNH" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                  <Campo label="Número *" error={errors.cnh_numero?.message}>
                    <Input className={fieldClass} {...register('cnh_numero')} />
                  </Campo>
                  <Campo label="Categoria *" error={errors.cnh_categoria?.message}>
                    <Input className={fieldClass} placeholder="AB" {...register('cnh_categoria')} />
                  </Campo>
                  <Campo label="Validade *" error={errors.cnh_validade?.message}>
                    <Input type="date" className={fieldClass} {...register('cnh_validade')} />
                  </Campo>
                  <Campo label="Possui CNH com EAR?">
                    <Select className={fieldClass} defaultValue="" {...register('cnh_ear')}>
                      <option value="">Selecione</option>
                      <option value="sim">Sim</option>
                      <option value="nao">Não</option>
                    </Select>
                  </Campo>
                </div>
              </section>

              <section>
                <SectionHeader numero="04" titulo="Sua experiência" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Campo label="Já trabalha como motorista de aplicativo?">
                    <Select className={fieldClass} defaultValue="" {...register('ja_dirige_app')}>
                      <option value="">Selecione</option>
                      <option value="sim">Sim</option>
                      <option value="nao">Não</option>
                    </Select>
                  </Campo>
                  <Campo label="Há quanto tempo?">
                    <Input className={fieldClass} placeholder="Ex.: 1 ano, 6 meses…" {...register('tempo_experiencia')} />
                  </Campo>
                </div>
                <div className="mt-4">
                  <Label className={labelClass}>Em quais aplicativos você roda?</Label>
                  <div className="flex flex-wrap gap-4">
                    {APPS_MOTORISTA.map((app) => (
                      <label key={app} className="flex items-center gap-2 text-sm text-neutral-700">
                        <input type="checkbox" value={app} className="h-4 w-4 rounded border-neutral-300 accent-[#2389FF]" {...register('apps_utilizados')} />
                        {app}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Campo label="Km rodados por semana (aprox.)">
                    <Input className={fieldClass} placeholder="Ex.: 800 km" {...register('km_semanal_estimado')} />
                  </Campo>
                  <Campo label="Possui veículo próprio hoje?">
                    <Select className={fieldClass} defaultValue="" {...register('possui_veiculo_proprio')}>
                      <option value="">Selecione</option>
                      <option value="sim">Sim</option>
                      <option value="nao">Não</option>
                    </Select>
                  </Campo>
                  <Campo label="Disponibilidade">
                    <Input className={fieldClass} placeholder="Ex.: período integral" {...register('disponibilidade_horas')} />
                  </Campo>
                </div>
              </section>

              <section>
                <SectionHeader numero="05" titulo="Referências e contato de emergência" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Campo label="Nome de uma referência pessoal">
                    <Input className={fieldClass} {...register('referencia_nome')} />
                  </Campo>
                  <Campo label="Telefone da referência">
                    <Input className={fieldClass} {...register('referencia_telefone')} />
                  </Campo>
                  <Campo label="Contato de emergência — nome">
                    <Input className={fieldClass} {...register('contato_emergencia_nome')} />
                  </Campo>
                  <Campo label="Contato de emergência — telefone">
                    <Input className={fieldClass} {...register('contato_emergencia_telefone')} />
                  </Campo>
                </div>
              </section>

              <section>
                <SectionHeader numero="06" titulo="Seu interesse" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Campo label="Quando pretende começar?">
                    <Select className={fieldClass} defaultValue="" {...register('quando_pretende_comecar')}>
                      <option value="">Selecione</option>
                      <option value="imediatamente">Imediatamente</option>
                      <option value="15_dias">Em até 15 dias</option>
                      <option value="30_dias">Em até 30 dias</option>
                      <option value="outro">Ainda não sei</option>
                    </Select>
                  </Campo>
                  <Campo label="Melhor horário para contato">
                    <Select className={fieldClass} defaultValue="" {...register('melhor_horario_contato')}>
                      <option value="">Selecione</option>
                      <option value="manha">Manhã</option>
                      <option value="tarde">Tarde</option>
                      <option value="noite">Noite</option>
                      <option value="qualquer">Qualquer horário</option>
                    </Select>
                  </Campo>
                </div>
                <div className="mt-4">
                  <Campo label="Qual carro você tem interesse? (opcional)">
                    <Input className={fieldClass} placeholder="Ex.: modelo visto no comparador" {...register('veiculoInteresse')} />
                  </Campo>
                </div>
                <div className="mt-4">
                  <Campo label="Quer contar algo mais? (opcional)">
                    <Textarea rows={3} className={fieldClass} {...register('observacoes')} />
                  </Campo>
                </div>
              </section>

              <section>
                <SectionHeader numero="07" titulo="Documentos" />
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

              <div className="border-t border-neutral-200 pt-6">
                <label className="flex items-start gap-2.5 text-sm text-neutral-600">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-neutral-300 accent-[#2389FF]"
                    {...register('aceitou_politica_privacidade')}
                  />
                  <span>
                    Li a{' '}
                    <Link to="/politica-privacidade" target="_blank" className="text-[#2389FF] hover:underline">
                      Política de Privacidade
                    </Link>{' '}
                    e estou ciente do uso dos meus dados para análise e contato sobre esta solicitação.
                  </span>
                </label>
                {errors.aceitou_politica_privacidade && (
                  <p className="mt-1 text-xs text-red-600">{errors.aceitou_politica_privacidade.message}</p>
                )}

                <Button
                  type="submit"
                  disabled={enviando}
                  className="mt-5 h-12 w-full rounded-xl bg-[#2389FF] text-base font-bold text-white hover:bg-[#1B6FDB] focus-visible:ring-[#2389FF] focus-visible:ring-offset-0"
                >
                  {enviando ? 'Enviando…' : (
                    <>
                      Enviar cadastro para análise <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
                <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-neutral-500">
                  <Mail className="h-3.5 w-3.5" />
                  Nossa equipe entrará em contato pelos dados informados.
                </p>
                <p className="mt-4 text-center text-sm text-neutral-500">
                  Já sou motorista aprovado e estou rodando.{' '}
                  <Link to="/login" className="font-medium text-[#2389FF] hover:underline">
                    Entrar no app
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </main>

      <footer className="border-t border-neutral-200 bg-white px-4 py-6 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 sm:flex-row">
          <div className="flex items-center gap-2">
            <img src={rodavoltLogo} alt="RodaVolt" className="h-5 w-auto" />
            <span className="text-xs text-neutral-400">Mobilidade que transforma.</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-neutral-500">
            <Link to="/politica-privacidade" className="hover:text-neutral-800">
              Política de Privacidade
            </Link>
            <Link to="/" className="hover:text-neutral-800">
              Voltar ao site
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
