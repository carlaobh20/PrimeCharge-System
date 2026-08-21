import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { EstadoFrescorLocalizacao } from '../../lib/localizacaoFrota';

// FASE 20 — Módulo 10/26: mapa real, SÓ carregado quando este arquivo é importado (o
// container faz isso via React.lazy — nunca no bundle inicial da tab "Inteligência da Frota",
// e nunca no app do motorista). Leaflet + tiles raster do OpenStreetMap (auditoria/
// CENTRO-INTELIGENCIA-FROTA.md — Leaflet escolhido por bundle menor; a frota de uma empresa não
// justifica renderização vetorial). Marcadores como `L.divIcon` (círculo colorido por estado,
// Módulo 11) — evita o problema clássico de asset de ícone do Leaflet quebrar em bundlers
// (Vite não resolve os PNGs default do pacote sem configuração extra), e já dá a cor certa sem
// depender de um ícone de imagem por estado.

const COR_POR_ESTADO: Record<EstadoFrescorLocalizacao, string> = {
  LOCALIZACAO_ATUAL: '#16a34a', // verde
  LOCALIZACAO_RECENTE: '#2563eb', // azul
  SEM_ATUALIZACAO: '#d97706', // âmbar
  SEM_LOCALIZACAO: '#9ca3af', // cinza — não deveria nem chegar aqui (sem coordenada, sem marcador)
};

function iconePara(estado: EstadoFrescorLocalizacao, selecionado: boolean): L.DivIcon {
  const cor = COR_POR_ESTADO[estado];
  const tamanho = selecionado ? 18 : 14;
  return L.divIcon({
    className: '',
    html: `<span style="display:block;width:${tamanho}px;height:${tamanho}px;border-radius:9999px;background:${cor};border:2px solid white;box-shadow:0 0 0 1px rgba(0,0,0,.25)"></span>`,
    iconSize: [tamanho, tamanho],
    iconAnchor: [tamanho / 2, tamanho / 2],
  });
}

export type MarcadorFrota = {
  id: string; // veiculoId
  latitude: number;
  longitude: number;
  estado: EstadoFrescorLocalizacao;
  placaLabel: string;
};

export function MapaFrota({
  marcadores,
  selecionadoId,
  onSelecionar,
}: {
  marcadores: MarcadorFrota[];
  selecionadoId: string | null;
  onSelecionar: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<L.Map | null>(null);
  const marcadoresRef = useRef<Map<string, L.Marker>>(new Map());

  useEffect(() => {
    if (!containerRef.current || mapaRef.current) return;
    const mapa = L.map(containerRef.current, { zoomControl: true }).setView([-14.235, -51.9253], 4); // Brasil, zoom inicial neutro — nunca uma cidade "padrão" inventada
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(mapa);
    mapaRef.current = mapa;
    return () => {
      mapa.remove();
      mapaRef.current = null;
    };
  }, []);

  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa) return;
    const existentes = marcadoresRef.current;

    // remove marcadores que saíram da lista
    for (const [id, marker] of existentes) {
      if (!marcadores.some((m) => m.id === id)) {
        marker.remove();
        existentes.delete(id);
      }
    }

    for (const m of marcadores) {
      const selecionado = m.id === selecionadoId;
      let marker = existentes.get(m.id);
      if (!marker) {
        marker = L.marker([m.latitude, m.longitude], { icon: iconePara(m.estado, selecionado) });
        marker.on('click', () => onSelecionar(m.id));
        marker.addTo(mapa);
        existentes.set(m.id, marker);
      } else {
        marker.setLatLng([m.latitude, m.longitude]);
        marker.setIcon(iconePara(m.estado, selecionado));
      }
      if (selecionado) marker.bindTooltip(m.placaLabel, { permanent: false });
    }

    if (marcadores.length > 0) {
      const bounds = L.latLngBounds(marcadores.map((m) => [m.latitude, m.longitude] as [number, number]));
      mapa.fitBounds(bounds, { padding: [32, 32], maxZoom: 14 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só reajusta quando o CONJUNTO de marcadores muda, não a cada seleção
  }, [marcadores]);

  // Ao selecionar (via lista), só troca o ícone do marcador — não refaz fitBounds (evitaria "pular" o mapa a cada clique na lista).
  useEffect(() => {
    for (const [id, marker] of marcadoresRef.current) {
      const m = marcadores.find((mm) => mm.id === id);
      if (m) marker.setIcon(iconePara(m.estado, id === selecionadoId));
    }
  }, [selecionadoId, marcadores]);

  return <div ref={containerRef} className="h-full w-full rounded-xl" />;
}

export default MapaFrota;
