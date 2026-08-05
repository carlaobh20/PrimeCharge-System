import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';

// Cliente único do Supabase para todo o app.
// Nenhum componente deve chamar createClient diretamente — sempre importe daqui.
export const supabase = createClient(env.supabaseUrl, env.supabasePublishableKey);
