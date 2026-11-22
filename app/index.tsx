import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Animated, Easing, Image, ImageBackground, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Session } from '@supabase/supabase-js';
import * as ImagePicker from 'expo-image-picker';
import { hasSupabaseConfig, supabase } from '../lib/supabase';

type Tab = 'Início' | 'Rotina' | 'Análise' | 'Evolução' | 'Perfil';
type UserProfile = { name: string; goal: string };
type ProgressRecord = { local_date: string; done: number[]; missionDone: boolean; updatedAt: string };
type AppearanceAdvice = { headline: string; observations: string[]; suggestions: { title: string; detail: string }[]; reminder: string };
type AppearanceRecord = { id: string; status: string; result: AppearanceAdvice | null; created_at: string };
const profileStorageKey = 'mens-evolution-profile-v1';
const progressStoragePrefix = 'mens-evolution-progress-';
const syncPauseStoragePrefix = 'mens-evolution-sync-paused-v1:';
const profileGoals = ['Autocuidado', 'Movimento', 'Estilo', 'Rotina'];
const ink = '#123E39';
const green = '#16705A';
const orange = '#F35A2B';
const lime = '#DDF28A';
const paper = '#F6F1E7';
const quiet = '#78847C';
const line = '#D8D8CA';
const todayDate = new Date();
const today = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(todayDate);
const todayShort = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(todayDate).replace('.', '').toUpperCase();
const todayIndex = (todayDate.getDay() + 6) % 7;
const todayProgressKey = `mens-evolution-progress-${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;
const todayLocalDate = todayProgressKey.replace(progressStoragePrefix, '');

const dailyEditions = [
  { category: 'AUTOCUIDADO', title: 'Dê atenção à barba.', detail: 'Acerte um detalhe com calma: contorno, pente ou cuidado depois de aparar.', image: require('../assets/daily/day-01.jpg') },
  { category: 'CUIDADO PESSOAL', title: 'Hidrate o rosto depois de lavar.', detail: 'Use o produto que já faz parte da sua rotina e aplique sem pressa.', image: require('../assets/daily/day-02.jpg') },
  { category: 'AUTOCUIDADO', title: 'Comece o dia lavando o rosto.', detail: 'Um cuidado simples pode marcar uma pausa antes da correria.', image: require('../assets/daily/day-03.jpg') },
  { category: 'ESTILO', title: 'Cuide do corte que você já tem.', detail: 'Ajuste um detalhe ou agende um corte quando sentir que é hora.', image: require('../assets/daily/day-04.jpg') },
  { category: 'CUIDADO PESSOAL', title: 'Prepare o próximo cuidado.', detail: 'Deixe toalha e produtos à mão para facilitar sua rotina amanhã.', image: require('../assets/daily/day-05.jpg') },
  { category: 'ESTILO', title: 'Monte o visual de amanhã hoje.', detail: 'Escolha peças que você já tem e experimente uma combinação nova.', image: require('../assets/daily/day-06.jpg') },
  { category: 'MOVIMENTO', title: 'Saia de casa com conforto.', detail: 'Separe um tênis que combine com a caminhada ou os compromissos do dia.', image: require('../assets/daily/day-07.jpg') },
  { category: 'ESTILO', title: 'Dê atenção a um detalhe.', detail: 'Relógio, manga ou acessório: escolha algo que tenha a sua cara.', image: require('../assets/daily/day-08.jpg') },
  { category: 'ESTILO', title: 'Use uma peça de outro jeito.', detail: 'Mude uma camada ou combinação sem precisar comprar nada novo.', image: require('../assets/daily/day-09.jpg') },
  { category: 'ESTILO', title: 'Deixe seus sapatos prontos.', detail: 'Limpe ou escolha o par que vai usar na próxima saída.', image: require('../assets/daily/day-10.jpg') },
  { category: 'MOVIMENTO', title: 'Faça uma pausa para se alongar.', detail: 'Solte braços e ombros por alguns minutos, no limite confortável do seu corpo.', image: require('../assets/daily/day-11.jpg') },
  { category: 'MOVIMENTO', title: 'Caminhe por alguns minutos.', detail: 'Escolha um trajeto simples e vá no seu próprio ritmo.', image: require('../assets/daily/day-12.jpg') },
  { category: 'MOVIMENTO', title: 'Prepare o corpo antes do treino.', detail: 'Reserve alguns minutos para aquecer, sem tentar compensar o que não fez.', image: require('../assets/daily/day-13.jpg') },
  { category: 'MOVIMENTO', title: 'Faça uma pausa ativa.', detail: 'Levante, mova o corpo e retome o dia quando estiver pronto.', image: require('../assets/daily/day-14.jpg') },
  { category: 'MOVIMENTO', title: 'Encerre o exercício com calma.', detail: 'Diminua o ritmo e perceba como você está depois de se movimentar.', image: require('../assets/daily/day-15.jpg') },
  { category: 'HIDRATAÇÃO', title: 'Leve água com você.', detail: 'Encha uma garrafa e deixe-a pronta para acompanhar seu dia.', image: require('../assets/daily/day-16.jpg') },
  { category: 'HIDRATAÇÃO', title: 'Deixe água perto da sua mesa.', detail: 'Ponha um copo ou garrafa ao alcance para lembrar de beber ao longo do dia.', image: require('../assets/daily/day-17.jpg') },
  { category: 'HIDRATAÇÃO', title: 'Faça uma pausa para beber água.', detail: 'Interrompa o que está fazendo por um instante e tome alguns goles.', image: require('../assets/daily/day-18.jpg') },
  { category: 'HIDRATAÇÃO', title: 'Comece a refeição com água por perto.', detail: 'Prepare um copo para acompanhar o momento, sem metas rígidas.', image: require('../assets/daily/day-19.jpg') },
  { category: 'HIDRATAÇÃO', title: 'Reabasteça sua garrafa.', detail: 'Aproveite uma pausa para encher a garrafa para o próximo trecho do dia.', image: require('../assets/daily/day-20.jpg') },
  { category: 'AMBIENTE', title: 'Cuide de uma planta ou de um canto.', detail: 'Regue, limpe ou reorganize só o que precisa de atenção agora.', image: require('../assets/daily/day-21.jpg') },
  { category: 'AMBIENTE', title: 'Organize uma pequena superfície.', detail: 'Escolha um canto da casa e deixe à vista apenas o que usa.', image: require('../assets/daily/day-22.jpg') },
  { category: 'FOCO', title: 'Deixe seu espaço pronto para começar.', detail: 'Tire do caminho uma coisa que costuma atrapalhar sua próxima tarefa.', image: require('../assets/daily/day-23.jpg') },
  { category: 'AMBIENTE', title: 'Separe o que vai usar amanhã.', detail: 'Deixe roupa ou itens da rotina preparados em um só lugar.', image: require('../assets/daily/day-24.jpg') },
  { category: 'AMBIENTE', title: 'Abra as janelas por alguns minutos.', detail: 'Renove o ar e aproveite para fazer uma pausa do ambiente fechado.', image: require('../assets/daily/day-25.jpg') },
  { category: 'REFLEXÃO', title: 'Anote uma coisa que deu certo.', detail: 'Uma linha já basta. Registre algo que gostaria de repetir.', image: require('../assets/daily/day-26.jpg') },
  { category: 'PRESENÇA', title: 'Faça uma pausa sem tela.', detail: 'Fique alguns minutos longe do celular e perceba o que está ao redor.', image: require('../assets/daily/day-27.jpg') },
  { category: 'REFLEXÃO', title: 'Escreva o que quer levar para amanhã.', detail: 'Uma ideia, uma prioridade ou algo que não precisa carregar com você.', image: require('../assets/daily/day-28.jpg') },
  { category: 'REFLEXÃO', title: 'Escolha uma intenção para hoje.', detail: 'Complete a frase: “Hoje eu quero abrir espaço para…”', image: require('../assets/daily/day-29.jpg') },
  { category: 'REFLEXÃO', title: 'Reconheça o passo que você deu.', detail: 'Pense em uma escolha pequena de hoje que vale a pena repetir.', image: require('../assets/daily/day-30.jpg') },
];
function hashSeed(key: string) {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i += 1) hash = Math.imul(hash ^ key.charCodeAt(i), 16777619);
  return hash >>> 0;
}
function historyDateLabel(value: string) {
  if (value === todayLocalDate) return 'HOJE';
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }).format(new Date(`${value}T12:00:00`)).replace('.', '').toUpperCase();
}
function shuffledMonth(year: number, month: number) {
  const order = dailyEditions.map((_, index) => index);
  let seed = hashSeed(`${year}-${month + 1}-mens-evolution`);
  for (let i = order.length - 1; i > 0; i -= 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}
function getDailyEdition(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const order = shuffledMonth(year, month);
  if (date.getDate() === 1) {
    const previousMonth = new Date(year, month, 0);
    const previousOrder = shuffledMonth(previousMonth.getFullYear(), previousMonth.getMonth());
    const previousSelection = previousOrder[(previousMonth.getDate() - 1) % dailyEditions.length];
    if (order[0] === previousSelection) order.push(order.shift() as number);
  }
  const selection = order[(date.getDate() - 1) % dailyEditions.length];
  return { ...dailyEditions[selection], drawNumber: String(selection + 1).padStart(2, '0') };
}
const dailyEdition = getDailyEdition(todayDate);
const easterEggMessages = ['O começo já conta.', 'Seu ritmo também é progresso.', 'Um detalhe muda o dia.', 'Não precisa ser perfeito pra valer.', 'Você voltou. Isso importa.', 'O próximo passo pode ser pequeno.'];
const dailyEasterEgg = easterEggMessages[hashSeed(`${todayDate.getFullYear()}-${todayDate.getMonth() + 1}-${todayDate.getDate()}-easter-egg`) % easterEggMessages.length];
const tasks = [
  { id: 1, title: 'Limpeza facial', detail: 'CUIDADO · 2 MIN' },
  { id: 2, title: 'Hidratar a pele', detail: 'CUIDADO · 1 MIN' },
  { id: 3, title: 'Treino de hoje', detail: 'PEITO E OMBROS · 35 MIN' },
  { id: 4, title: 'Beber água', detail: 'AO LONGO DO DIA' },
];

function PageHeading({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return <View style={s.pageHeading}><Text style={s.eyebrow}>{eyebrow}</Text><Text style={s.pageTitle}>{title}</Text><Text style={s.pageSubtitle}>{subtitle}</Text></View>;
}

function TaskRows({ ids, done, toggle }: { ids: number[]; done: number[]; toggle: (id: number) => void }) {
  const items = tasks.filter((task) => ids.includes(task.id));
  return <View style={s.taskList}>{items.map((task, index) => {
    const complete = done.includes(task.id);
    return <TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: complete }} key={task.id} onPress={() => toggle(task.id)} style={[s.taskRow, index < items.length - 1 && s.rowRule]}>
      <Text style={[s.taskIndex, complete && s.taskIndexDone]}>{String(task.id).padStart(2, '0')}</Text>
      <View style={s.taskCopy}><Text style={[s.taskName, complete && s.taskNameDone]}>{task.title}</Text><Text style={s.taskMeta}>{task.detail}</Text></View>
      <View style={[s.taskCheck, complete && s.taskCheckDone]}>{complete ? <Text style={s.checkGlyph}>✓</Text> : null}</View>
    </TouchableOpacity>;
  })}</View>;
}

export default function Home() {
  const [tab, setTab] = useState<Tab>('Início');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [historyRecords, setHistoryRecords] = useState<ProgressRecord[]>([]);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [progressUpdatedAt, setProgressUpdatedAt] = useState(`${todayLocalDate}T00:00:00.000Z`);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileGoal, setProfileGoal] = useState(profileGoals[0]);
  const [changingFocus, setChangingFocus] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [easterEggRevealed, setEasterEggRevealed] = useState(false);
  const [done, setDone] = useState<number[]>([]);
  const [missionRevealed, setMissionRevealed] = useState(false);
  const [missionDone, setMissionDone] = useState(false);
  const [notice, setNotice] = useState('');
  const [session, setSession] = useState<Session | null>(null);
  const [cloudSyncPaused, setCloudSyncPaused] = useState(false);
  const [syncPreferenceLoaded, setSyncPreferenceLoaded] = useState(false);
  const [dataDeleteExpanded, setDataDeleteExpanded] = useState(false);
  const [dataDeleteBusy, setDataDeleteBusy] = useState(false);
  const [analysisPhotoUri, setAnalysisPhotoUri] = useState<string | null>(null);
  const [analysisConsent, setAnalysisConsent] = useState(false);
  const [analysisBusy, setAnalysisBusy] = useState(false);
  const [analysisRecords, setAnalysisRecords] = useState<AppearanceRecord[]>([]);
  const [analysisHistoryBusy, setAnalysisHistoryBusy] = useState(false);
  const [accountMode, setAccountMode] = useState<'signin' | 'signup' | null>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [authError, setAuthError] = useState(false);
  const syncedUser = useRef<string | null>(null);
  const entrance = useRef(new Animated.Value(0)).current;
  const reveal = useRef(new Animated.Value(0)).current;
  const orbit = useRef(new Animated.Value(0)).current;
  const focusMotion = useRef(new Animated.Value(1)).current;
  const optionMotions = useRef([new Animated.Value(1), new Animated.Value(1), new Animated.Value(1)]).current;
  const easterPulse = useRef(new Animated.Value(0)).current;
  const easterReveal = useRef(new Animated.Value(0)).current;
  const progress = Math.round(done.length / tasks.length * 100);
  const points = done.length * 10 + (missionDone ? 10 : 0);
  const phases = [
    { number: '01', title: 'BASE', description: 'Comece pelo que cabe hoje.', open: done.length >= 1 },
    { number: '02', title: 'CUIDADO', description: 'Descubra o que funciona para você.', open: done.length >= 2 },
    { number: '03', title: 'MOVIMENTO', description: 'Crie um ritmo que dê para repetir.', open: done.length >= 3 },
    { number: '04', title: 'ESTILO', description: 'Faça escolhas que tenham a sua cara.', open: done.length >= 4 },
    { number: '05', title: 'CONSISTÊNCIA', description: 'Volte ao caminho sem recomeçar do zero.', open: missionDone },
  ];
  const openPhaseCount = phases.filter((phase) => phase.open).length;
  const recentHistory = historyRecords.slice(0, 30);
  const visibleHistory = historyExpanded ? recentHistory : recentHistory.slice(0, 7);
  const recordedSteps = recentHistory.reduce((total, record) => total + record.done.length, 0);
  const toggle = (id: number) => { setProgressUpdatedAt(new Date().toISOString()); setDone((current) => current.includes(id) ? current.filter((n) => n !== id) : [...current, id]); };
  const showNotice = (message: string) => { setNotice(message); setTimeout(() => setNotice(''), 2400); };

  const syncAccountData = async (userId: string) => {
    if (!supabase || !profile) return false;
    if (await AsyncStorage.getItem(`${syncPauseStoragePrefix}${userId}`) === 'true') { setCloudSyncPaused(true); return false; }
    syncedUser.current = userId;
    const { data: remoteProfile, error: profileReadError } = await supabase.from('profiles').select('display_name,focus').eq('user_id', userId).maybeSingle();
    if (profileReadError) throw profileReadError;
    let currentProfile = profile;
    if (remoteProfile?.display_name) {
      currentProfile = { name: remoteProfile.display_name, goal: profileGoals.includes(remoteProfile.focus) ? remoteProfile.focus : profileGoals[0] };
      setProfile(currentProfile);
      setProfileName(currentProfile.name);
      setProfileGoal(currentProfile.goal);
      await AsyncStorage.setItem(profileStorageKey, JSON.stringify(currentProfile));
    } else {
      const { error } = await supabase.from('profiles').upsert({ user_id: userId, display_name: profile.name, focus: profile.goal, updated_at: new Date().toISOString() });
      if (error) throw error;
    }
    const cutoff = new Date(todayDate);
    cutoff.setDate(cutoff.getDate() - 89);
    const cutoffDate = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`;
    const { data: remoteProgress, error: progressReadError } = await supabase.from('daily_progress').select('local_date,completed_task_ids,mission_done,updated_at').eq('user_id', userId).gte('local_date', cutoffDate).order('local_date', { ascending: false });
    if (progressReadError) throw progressReadError;
    const localToday = { local_date: todayLocalDate, done, missionDone, updatedAt: progressUpdatedAt };
    const recordsByDate = new Map<string, ProgressRecord>();
    [...historyRecords.filter((record) => record.local_date >= cutoffDate), localToday].forEach((record) => recordsByDate.set(record.local_date, record));
    (remoteProgress ?? []).forEach((remote: { local_date: string; completed_task_ids: number[]; mission_done: boolean; updated_at: string }) => {
      const local = recordsByDate.get(remote.local_date);
      const cloudRecord: ProgressRecord = { local_date: remote.local_date, done: (remote.completed_task_ids ?? []).filter((id: number) => tasks.some((task) => task.id === id)), missionDone: Boolean(remote.mission_done), updatedAt: remote.updated_at };
      if (!local || Date.parse(local.updatedAt) < Date.parse(cloudRecord.updatedAt)) recordsByDate.set(remote.local_date, cloudRecord);
    });
    const mergedHistory = [...recordsByDate.values()].sort((a, b) => b.local_date.localeCompare(a.local_date));
    const currentRecord = mergedHistory.find((record) => record.local_date === todayLocalDate) ?? localToday;
    setHistoryRecords(mergedHistory);
    setDone(currentRecord.done);
    setMissionDone(currentRecord.missionDone);
    setProgressUpdatedAt(currentRecord.updatedAt);
    await Promise.all(mergedHistory.map((record) => AsyncStorage.setItem(`${progressStoragePrefix}${record.local_date}`, JSON.stringify({ done: record.done, missionDone: record.missionDone, updatedAt: record.updatedAt }))));
    const { error: progressWriteError } = await supabase.from('daily_progress').upsert(mergedHistory.map((record) => ({ user_id: userId, local_date: record.local_date, completed_task_ids: record.done, mission_done: record.missionDone, updated_at: record.updatedAt })));
    if (progressWriteError) throw progressWriteError;
    return true;
  };

  const submitAuth = async () => {
    if (!supabase) return;
    const email = authEmail.trim().toLowerCase();
    if (!email || !authPassword) { setAuthError(true); setAuthMessage('Informe seu e-mail e sua senha.'); return; }
    setAuthBusy(true); setAuthError(false); setAuthMessage('');
    try {
      if (accountMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password: authPassword, options: { data: { display_name: profile?.name ?? '', focus: profile?.goal ?? profileGoals[0] } } });
        if (error) throw error;
        if (data.session) {
          setSession(data.session);
          const synced = await syncAccountData(data.user.id);
          setAccountMode(null);
          setAuthMessage('');
          showNotice(synced ? 'Conta criada e dados sincronizados.' : 'Conta criada. A sincronização está pausada neste aparelho.');
        } else {
          setAuthMessage('Conta criada. Confirme o e-mail e depois entre.');
          setAccountMode('signin');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password: authPassword });
        if (error) throw error;
        if (data.session) {
          setSession(data.session);
          const synced = await syncAccountData(data.user.id);
          setAccountMode(null);
          setAuthMessage('');
          showNotice(synced ? 'Conta conectada e dados sincronizados.' : 'Conta conectada. A sincronização está pausada neste aparelho.');
        }
      }
    } catch (error) {
      syncedUser.current = null;
      setAuthError(true);
      setAuthMessage(error instanceof Error ? error.message : 'Não foi possível conectar agora. Tente novamente.');
    } finally { setAuthBusy(false); }
  };

  const signOut = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) { showNotice('Não foi possível sair agora.'); return; }
    syncedUser.current = null;
    setSession(null);
    setAnalysisPhotoUri(null);
    setAnalysisConsent(false);
    showNotice('Sessão encerrada. Seus dados continuam neste aparelho.');
  };

  const retrySync = async () => {
    if (!session?.user.id) return;
    try {
      await AsyncStorage.removeItem(`${syncPauseStoragePrefix}${session.user.id}`);
      setCloudSyncPaused(false);
      syncedUser.current = null;
      await syncAccountData(session.user.id);
      showNotice('Sincronização reativada.');
    }
    catch (error) { syncedUser.current = null; showNotice(error instanceof Error ? `Sincronização: ${error.message}` : 'Não foi possível sincronizar agora.'); }
  };

  const eraseSyncedData = async () => {
    if (!supabase || !session?.user.id) return;
    setDataDeleteBusy(true);
    const pauseKey = `${syncPauseStoragePrefix}${session.user.id}`;
    let pauseWritten = false;
    try {
      await AsyncStorage.setItem(pauseKey, 'true');
      pauseWritten = true;
      setCloudSyncPaused(true);
      const { data, error } = await supabase.functions.invoke('erase-synced-data', { body: {} });
      if (error) {
        let serverMessage = '';
        try { serverMessage = (await error.context?.clone().json())?.error ?? ''; } catch { /* use the generic function error below */ }
        throw new Error(serverMessage || error.message);
      }
      if (data?.error) throw new Error(data.error);
      syncedUser.current = session.user.id;
      setDataDeleteExpanded(false);
      showNotice('Dados da nuvem apagados. Sincronização pausada.');
    } catch {
      if (pauseWritten) setCloudSyncPaused(true);
      showNotice(pauseWritten ? 'Não foi possível concluir. A sincronização segue pausada; você pode tentar novamente.' : 'Não foi possível salvar a preferência. Tente novamente.');
    } finally { setDataDeleteBusy(false); }
  };

  const loadAppearanceHistory = async (userId: string) => {
    if (!supabase) return;
    setAnalysisHistoryBusy(true);
    try {
      const { data, error } = await supabase.from('appearance_analyses').select('id,status,result,created_at').eq('user_id', userId).eq('status', 'completed').order('created_at', { ascending: false }).limit(10);
      if (!error) setAnalysisRecords((data ?? []) as AppearanceRecord[]);
    } finally { setAnalysisHistoryBusy(false); }
  };

  const chooseAnalysisPhoto = async (useCamera = false) => {
    if (useCamera) {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) { showNotice('A câmera precisa de permissão para tirar a foto.'); return; }
    } else {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) { showNotice('Permita o acesso às fotos para escolher uma imagem.'); return; }
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [4, 5], quality: 0.82, exif: false };
    const result = useCamera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled || !result.assets[0]?.uri) return;
    setAnalysisPhotoUri(result.assets[0].uri);
  };

  const submitAppearanceAnalysis = async () => {
    if (!supabase || !session?.user.id) {
      showNotice('Entre na sua conta para fazer uma análise privada.');
      setTab('Perfil');
      if (hasSupabaseConfig) setAccountMode('signin');
      return;
    }
    if (!analysisPhotoUri) { showNotice('Escolha uma foto primeiro.'); return; }
    if (!analysisConsent) { showNotice('Leia e aceite o uso da foto para continuar.'); return; }
    setAnalysisBusy(true);
    let recordId: string | null = null;
    let photoPath: string | null = null;
    try {
      const { data: row, error: createError } = await supabase.from('appearance_analyses').insert({ user_id: session.user.id, consent_at: new Date().toISOString() }).select('id').single();
      if (createError) throw createError;
      recordId = row.id;
      photoPath = `${session.user.id}/${recordId}.jpg`;
      const imageResponse = await fetch(analysisPhotoUri);
      const imageBlob = await imageResponse.blob();
      if (imageBlob.size > 8 * 1024 * 1024) throw new Error('A foto passou do limite de 8 MB. Escolha uma imagem menor.');
      const { error: uploadError } = await supabase.storage.from('analysis-photos').upload(photoPath, imageBlob, { contentType: 'image/jpeg', upsert: false });
      if (uploadError) throw uploadError;
      const { data, error: invokeError } = await supabase.functions.invoke('analyze-appearance', { body: { analysis_id: recordId } });
      if (invokeError) {
        let serverMessage = '';
        try { serverMessage = (await invokeError.context?.clone().json())?.error ?? ''; } catch { /* use the generic function error below */ }
        throw new Error(serverMessage || invokeError.message);
      }
      if (data?.error) throw new Error(data.error);
      await loadAppearanceHistory(session.user.id);
      setAnalysisPhotoUri(null);
      setAnalysisConsent(false);
      showNotice('Análise pronta. A foto temporária foi removida.');
    } catch (error) {
      if (photoPath) await supabase.storage.from('analysis-photos').remove([photoPath]).catch(() => undefined);
      if (recordId) await supabase.from('appearance_analyses').delete().eq('id', recordId).eq('user_id', session.user.id);
      const message = error instanceof Error ? error.message : '';
      showNotice(message.includes('8 MB') || message.includes('três leituras') || message.includes('Serviço ainda não configurado') ? message : 'Não foi possível concluir. Confira sua conexão e tente novamente.');
    } finally {
      setAnalysisBusy(false);
    }
  };

  const deleteAppearanceRecord = async (id: string) => {
    if (!supabase || !session?.user.id) return;
    const { error } = await supabase.from('appearance_analyses').delete().eq('id', id).eq('user_id', session.user.id);
    if (error) { showNotice('Não foi possível apagar este resultado.'); return; }
    setAnalysisRecords((records) => records.filter((record) => record.id !== id));
    showNotice('Resultado apagado.');
  };

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => { if (mounted) setSession(data.session); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    let active = true;
    const userId = session?.user.id;
    setSyncPreferenceLoaded(false);
    if (!userId) {
      setCloudSyncPaused(false);
      setSyncPreferenceLoaded(true);
      return () => { active = false; };
    }
    AsyncStorage.getItem(`${syncPauseStoragePrefix}${userId}`).then((value) => {
      if (active) setCloudSyncPaused(value === 'true');
    }).catch(() => {
      if (active) setCloudSyncPaused(false);
    }).finally(() => {
      if (active) setSyncPreferenceLoaded(true);
    });
    return () => { active = false; };
  }, [session?.user.id]);

  useEffect(() => {
    if (!session?.user.id) { setAnalysisRecords([]); setAnalysisHistoryBusy(false); return; }
    let active = true;
    setAnalysisHistoryBusy(true);
    supabase?.from('appearance_analyses').select('id,status,result,created_at').eq('user_id', session.user.id).eq('status', 'completed').order('created_at', { ascending: false }).limit(10).then(({ data, error }) => {
      if (active && !error) setAnalysisRecords((data ?? []) as AppearanceRecord[]);
      if (active) setAnalysisHistoryBusy(false);
    });
    return () => { active = false; };
  }, [session?.user.id]);

  useEffect(() => {
    if (!session?.user.id || !profile || !profileLoaded || !progressLoaded || !historyLoaded || !syncPreferenceLoaded || cloudSyncPaused || syncedUser.current === session.user.id) return;
    syncAccountData(session.user.id).catch((error) => { syncedUser.current = null; showNotice(error instanceof Error ? `Sincronização: ${error.message}` : 'Não foi possível sincronizar agora.'); });
  }, [session?.user.id, profile, profileLoaded, progressLoaded, historyLoaded, syncPreferenceLoaded, cloudSyncPaused]);

  useEffect(() => {
    if (!supabase || !session?.user.id || !syncPreferenceLoaded || cloudSyncPaused || syncedUser.current !== session.user.id || !profile) return;
    supabase.from('profiles').upsert({ user_id: session.user.id, display_name: profile.name, focus: profile.goal, updated_at: new Date().toISOString() }).then(({ error }) => { if (error) showNotice('Perfil salvo no aparelho; sincronização pendente.'); });
  }, [profile, session?.user.id, syncPreferenceLoaded, cloudSyncPaused]);

  useEffect(() => {
    if (!supabase || !session?.user.id || !syncPreferenceLoaded || cloudSyncPaused || syncedUser.current !== session.user.id || !progressLoaded) return;
    supabase.from('daily_progress').upsert({ user_id: session.user.id, local_date: todayLocalDate, completed_task_ids: done, mission_done: missionDone, updated_at: progressUpdatedAt }).then(({ error }) => { if (error) showNotice('Progresso salvo no aparelho; sincronização pendente.'); });
  }, [done, missionDone, progressLoaded, progressUpdatedAt, session?.user.id, syncPreferenceLoaded, cloudSyncPaused]);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(profileStorageKey).then((value) => {
      if (!mounted || !value) return;
      const stored = JSON.parse(value) as UserProfile;
      if (typeof stored.name === 'string' && typeof stored.goal === 'string') {
        setProfile(stored);
        setProfileName(stored.name);
        setProfileGoal(profileGoals.includes(stored.goal) ? stored.goal : profileGoals[0]);
      }
    }).catch(() => undefined).finally(() => { if (mounted) setProfileLoaded(true); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(todayProgressKey).then((value) => {
      if (!mounted || !value) return;
      const stored = JSON.parse(value) as { done?: unknown; missionDone?: unknown };
      if (Array.isArray(stored.done)) setDone(stored.done.filter((id): id is number => typeof id === 'number' && tasks.some((task) => task.id === id)));
      if (typeof stored.missionDone === 'boolean') setMissionDone(stored.missionDone);
      if (typeof (stored as { updatedAt?: unknown }).updatedAt === 'string') setProgressUpdatedAt((stored as { updatedAt: string }).updatedAt);
    }).catch(() => undefined).finally(() => { if (mounted) setProgressLoaded(true); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getAllKeys().then((keys) => AsyncStorage.multiGet(keys.filter((key) => key.startsWith(progressStoragePrefix)))).then((entries) => {
      if (!mounted) return;
      const records = entries.flatMap(([key, value]) => {
        if (!value) return [];
        try {
          const stored = JSON.parse(value) as { done?: unknown; missionDone?: unknown; updatedAt?: unknown };
          const local_date = key.replace(progressStoragePrefix, '');
          if (!/^\d{4}-\d{2}-\d{2}$/.test(local_date)) return [];
          return [{ local_date, done: Array.isArray(stored.done) ? stored.done.filter((id): id is number => typeof id === 'number' && tasks.some((task) => task.id === id)) : [], missionDone: stored.missionDone === true, updatedAt: typeof stored.updatedAt === 'string' ? stored.updatedAt : `${local_date}T00:00:00.000Z` }];
        } catch { return []; }
      }).sort((a, b) => b.local_date.localeCompare(a.local_date));
      setHistoryRecords(records);
    }).catch(() => undefined).finally(() => { if (mounted) setHistoryLoaded(true); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!progressLoaded || !historyLoaded) return;
    const current = { local_date: todayLocalDate, done, missionDone, updatedAt: progressUpdatedAt };
    AsyncStorage.setItem(todayProgressKey, JSON.stringify({ done, missionDone, updatedAt: progressUpdatedAt })).catch(() => undefined);
    setHistoryRecords((records) => [current, ...records.filter((record) => record.local_date !== todayLocalDate)].sort((a, b) => b.local_date.localeCompare(a.local_date)));
  }, [done, missionDone, progressLoaded, historyLoaded, progressUpdatedAt]);

  useEffect(() => {
    if (profileLoaded && profile && !editingProfile) return;
    easterPulse.setValue(0);
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(easterPulse, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(easterPulse, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    pulse.start();
    return () => pulse.stop();
  }, [profileLoaded, profile, editingProfile, easterPulse]);

  const saveProfile = async () => {
    const name = profileName.trim();
    if (!name) { setProfileError('Escreva como podemos te chamar.'); return; }
    const nextProfile = { name, goal: profileGoal };
    try {
      await AsyncStorage.setItem(profileStorageKey, JSON.stringify(nextProfile));
      setProfile(nextProfile);
      setEditingProfile(false);
      setProfileError('');
      if (profile) showNotice('Perfil atualizado.');
    } catch {
      setProfileError('Não foi possível salvar agora. Tente de novo.');
    }
  };

  const openProfileEditor = () => {
    setProfileName(profile?.name ?? '');
    setProfileGoal(profile?.goal ?? profileGoals[0]);
    setProfileError('');
    setEditingProfile(true);
  };

  const chooseProfileGoal = (goal: string) => {
    if (goal === profileGoal || changingFocus) return;
    setChangingFocus(true);
    const alternativesFold = Animated.stagger(38, optionMotions.map((motion) => Animated.timing(motion, { toValue: 0, duration: 105, useNativeDriver: true })));
    Animated.parallel([
      Animated.timing(focusMotion, { toValue: 0, duration: 145, useNativeDriver: true }),
      alternativesFold,
    ]).start(({ finished }) => {
      if (!finished) { setChangingFocus(false); return; }
      setProfileGoal(goal);
      focusMotion.setValue(0);
      optionMotions.forEach((motion) => motion.setValue(0));
      Animated.parallel([
        Animated.spring(focusMotion, { toValue: 1, friction: 5, tension: 62, useNativeDriver: true }),
        Animated.stagger(62, optionMotions.map((motion) => Animated.spring(motion, { toValue: 1, friction: 6, tension: 58, useNativeDriver: true }))),
      ]).start(() => setChangingFocus(false));
    });
  };

  const revealEasterEgg = () => {
    setEasterEggRevealed(true);
    easterReveal.setValue(0);
    Animated.spring(easterReveal, { toValue: 1, friction: 7, tension: 65, useNativeDriver: true }).start();
    setTimeout(() => setEasterEggRevealed(false), 2800);
  };

  useEffect(() => {
    if (tab !== 'Início') return;
    entrance.setValue(0);
    orbit.setValue(0);
    const arrive = Animated.spring(entrance, { toValue: 1, useNativeDriver: true, friction: 8, tension: 44 });
    const turn = Animated.loop(Animated.timing(orbit, { toValue: 1, duration: 16000, easing: Easing.linear, useNativeDriver: true }));
    arrive.start(); turn.start();
    return () => { arrive.stop(); turn.stop(); };
  }, [tab, entrance, orbit]);

  const revealMission = () => {
    setMissionRevealed(true);
    reveal.setValue(0);
    Animated.spring(reveal, { toValue: 1, useNativeDriver: true, friction: 7, tension: 55 }).start();
  };

  if (!profileLoaded || !progressLoaded || !historyLoaded) return <SafeAreaView style={s.safe} edges={['top']}><StatusBar barStyle="dark-content" /><View style={s.profileLoading}><Text style={s.profileLoadingText}>PREPARANDO SEU ESPAÇO</Text></View></SafeAreaView>;

  if (!profile || editingProfile) return <SafeAreaView style={s.setupSafe} edges={['top']}>
    <StatusBar barStyle="light-content" />
    <ImageBackground source={require('../assets/onboarding-texture.jpg')} resizeMode="cover" style={s.setupBackdrop}>
    <View pointerEvents="none" style={s.setupTint} />
    <ScrollView contentContainerStyle={s.setupPage} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={s.setupTop}><View style={s.setupWordmark}><Text style={s.setupMark}>ME</Text><Text style={s.setupBrand}>MEN'S EVOLUTION</Text></View><Text style={s.setupIndex}>{profile ? 'PERFIL / AJUSTE' : 'COMEÇO / 01'}</Text></View>
      <View style={s.setupIntro}>
        <Text style={s.setupEyebrow}>{profile ? 'SEU CAMINHO, SUAS REGRAS' : 'SEM PRESSA. SEM COMPARAÇÃO.'}</Text>
        <Text style={s.setupTitle}>{profile ? 'MUDOU O FOCO?' : <>COMEÇA{'\n'}POR VOCÊ.</>}</Text>
        <Text style={s.setupSubtitle}>Um ponto de partida simples. Você pode mudar essas escolhas quando quiser.</Text>
      </View>
      <View style={s.setupForm}>
        <Text style={s.setupLabel}>COMO PODEMOS TE CHAMAR?</Text>
        <TextInput value={profileName} onChangeText={(value) => { setProfileName(value); setProfileError(''); }} placeholder="Seu nome" placeholderTextColor="#A9B5A9" style={s.setupInput} maxLength={40} autoCapitalize="words" autoCorrect={false} returnKeyType="done" />
        <Text style={s.setupLabel}>SEU FOCO PRINCIPAL</Text>
        <Animated.View style={[s.primaryGoal, { opacity: focusMotion, transform: [{ translateY: focusMotion.interpolate({ inputRange: [0, 1], outputRange: [-14, 0] }) }, { rotate: focusMotion.interpolate({ inputRange: [0, 1], outputRange: ['-3deg', '0deg'] }) }, { scale: focusMotion.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) }] }]}>
          <View style={s.primaryGoalMeta}><Text style={s.primaryGoalKicker}>PONTO DE PARTIDA</Text><Text style={s.primaryGoalNumber}>01 / 04</Text></View>
          <View style={s.primaryGoalBottom}><Text style={s.primaryGoalTitle}>{profileGoal.toUpperCase()}</Text><Text style={s.primaryGoalArrow}>↗</Text></View>
        </Animated.View>
        <View style={s.secondaryGoalHeading}><Text style={s.secondaryGoalTitle}>OUTRAS ROTAS</Text><Text style={s.secondaryGoalHint}>ESCOLHA UMA</Text></View>
        <View style={s.secondaryGoals}>{profileGoals.filter((goal) => goal !== profileGoal).map((goal, index) => <Animated.View key={goal} style={[s.secondaryGoalWrap, { opacity: optionMotions[index].interpolate({ inputRange: [0, 1], outputRange: [0.38, 1] }), transform: [{ translateY: optionMotions[index].interpolate({ inputRange: [0, 1], outputRange: [9, 0] }) }, { translateX: optionMotions[index].interpolate({ inputRange: [0, 1], outputRange: [index === 1 ? 8 : -8, 0] }) }, { scale: optionMotions[index].interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }] }]}><TouchableOpacity disabled={changingFocus} accessibilityRole="radio" accessibilityState={{ selected: profileGoal === goal }} onPress={() => chooseProfileGoal(goal)} style={s.secondaryGoal}><Text style={s.secondaryGoalNumber}>{String(index + 2).padStart(2, '0')}</Text><Text style={s.secondaryGoalLabel}>{goal.toUpperCase()}</Text><Text style={s.secondaryGoalArrow}>↗</Text></TouchableOpacity></Animated.View>)}</View>
        {profileError ? <Text accessibilityRole="alert" style={s.setupError}>{profileError}</Text> : null}
      </View>
      <View style={s.setupBottom}>
        <Text style={s.setupPrivacy}>Fica salvo neste aparelho nesta versão.</Text>
        <TouchableOpacity style={s.setupButton} onPress={saveProfile} activeOpacity={0.85}><Text style={s.setupButtonText}>{profile ? 'SALVAR AJUSTES' : 'COMEÇAR MINHA EVOLUÇÃO'}</Text><Text style={s.setupButtonArrow}>↗</Text></TouchableOpacity>
        {profile && <TouchableOpacity onPress={() => setEditingProfile(false)} style={s.setupCancel}><Text style={s.setupCancelText}>VOLTAR AO PERFIL</Text></TouchableOpacity>}
      </View>
    </ScrollView>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel="Revelar detalhe escondido do dia" onPress={revealEasterEgg} activeOpacity={0.85} style={s.easterHotspot}>
      <Animated.View style={[s.easterMark, { opacity: easterPulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }), transform: [{ scale: easterPulse.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1.08] }) }] }]}><Text style={s.easterGlyph}>✳</Text></Animated.View>
    </TouchableOpacity>
    {easterEggRevealed ? <Animated.View pointerEvents="none" style={[s.easterNote, { opacity: easterReveal, transform: [{ translateY: easterReveal.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }, { scale: easterReveal.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }] }]}><Text style={s.easterNoteKicker}>ACHOU / {todayShort}</Text><Text style={s.easterNoteText}>{dailyEasterEgg}</Text></Animated.View> : null}
    </ImageBackground>
  </SafeAreaView>;

  if (accountMode) return <SafeAreaView style={s.setupSafe} edges={['top']}>
    <StatusBar barStyle="light-content" />
    <ImageBackground source={require('../assets/onboarding-texture.jpg')} resizeMode="cover" style={s.setupBackdrop}>
      <View pointerEvents="none" style={s.setupTint} />
      <ScrollView contentContainerStyle={s.authPage} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={s.setupTop}><View style={s.setupWordmark}><Text style={s.setupMark}>ME</Text><Text style={s.setupBrand}>MEN'S EVOLUTION</Text></View><Text style={s.setupIndex}>CONTA / 02</Text></View>
        <View style={s.authIntro}><Text style={s.setupEyebrow}>SEU CAMINHO, EM MAIS DE UM LUGAR</Text><Text style={s.authTitle}>{accountMode === 'signup' ? 'LEVA SUA\nEVOLUÇÃO.' : 'BEM DE\nVOLTA.'}</Text><Text style={s.setupSubtitle}>Seu perfil e o progresso diário podem acompanhar você.</Text></View>
        {!hasSupabaseConfig ? <View style={s.authInfo}><Text style={s.authInfoMark}>↗</Text><Text style={s.authInfoTitle}>A CONTA ESTÁ PRONTA PARA CONECTAR</Text><Text style={s.authInfoText}>Falta ligar o projeto de nuvem do app. Até lá, seu perfil e seu progresso continuam salvos neste aparelho.</Text></View> : <View style={s.authForm}>
          <Text style={s.setupLabel}>E-MAIL</Text><TextInput value={authEmail} onChangeText={setAuthEmail} placeholder="voce@email.com" placeholderTextColor="#A9B5A9" style={s.setupInput} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="emailAddress" />
          <Text style={s.setupLabel}>SENHA</Text><TextInput value={authPassword} onChangeText={setAuthPassword} placeholder="Mínimo de 6 caracteres" placeholderTextColor="#A9B5A9" style={s.setupInput} secureTextEntry textContentType={accountMode === 'signup' ? 'newPassword' : 'password'} />
          {authMessage ? <Text accessibilityRole={authError ? 'alert' : undefined} style={[s.authMessage, authError && s.authMessageError]}>{authMessage}</Text> : null}
          <TouchableOpacity disabled={authBusy} style={[s.setupButton, authBusy && s.authButtonBusy]} onPress={submitAuth} activeOpacity={0.85}><Text style={s.setupButtonText}>{authBusy ? 'CONECTANDO…' : accountMode === 'signup' ? 'CRIAR MINHA CONTA' : 'ENTRAR E SINCRONIZAR'}</Text><Text style={s.setupButtonArrow}>↗</Text></TouchableOpacity>
        </View>}
        {hasSupabaseConfig ? <TouchableOpacity onPress={() => { setAccountMode(accountMode === 'signup' ? 'signin' : 'signup'); setAuthMessage(''); setAuthError(false); }} style={s.authSwitch}><Text style={s.authSwitchText}>{accountMode === 'signup' ? 'JÁ TEM UMA CONTA? ENTRAR' : 'AINDA NÃO TEM CONTA? CRIAR'}</Text></TouchableOpacity> : null}
        <Text style={s.setupPrivacy}>Sua evolução continua acessível mesmo offline.</Text>
      </ScrollView>
      <TouchableOpacity onPress={() => setAccountMode(null)} style={s.authBack}><Text style={s.authBackText}>← VOLTAR AO PERFIL</Text></TouchableOpacity>
    </ImageBackground>
  </SafeAreaView>;

  return <SafeAreaView style={s.safe} edges={['top']}>
    <StatusBar barStyle="dark-content" />
    <View style={s.topBar}>
      <TouchableOpacity onPress={() => setTab('Início')} style={s.wordmark}><Text style={s.wordmarkME}>ME</Text><Text style={s.wordmarkName}>MEN'S EVOLUTION</Text></TouchableOpacity>
      <TouchableOpacity onPress={() => setTab('Perfil')} style={s.profileLink}><Text style={s.profileLinkText}>MEU PERFIL</Text><Text style={s.profileArrow}>↗</Text></TouchableOpacity>
    </View>

    {tab === 'Início' && <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <View style={s.homeIntro}><Text style={s.dateStamp}>{today.toUpperCase()}</Text><Text style={s.homeTitle}>BORA{ '\n' }MUDAR{ '\n' }O RITMO?</Text><Text style={s.homeSubtitle}>Um passo pequeno já conta como virada.</Text></View>

      <Animated.View style={[s.heroStage, { opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [26, 0] }) }] }]}>
        <ImageBackground source={dailyEdition.image} resizeMode="cover" style={s.heroImage} imageStyle={s.heroImageShape}>
          <View style={s.heroTopline}><Text style={s.heroBrand}>MEN'S EVOLUTION</Text><Text style={s.heroDate}>{todayShort}</Text></View>
          <View style={s.heroCopyPlate}><View style={s.heroCopy}><Text style={s.heroKicker}>EDIÇÃO · {dailyEdition.drawNumber}/30</Text><Text style={s.heroHeadline}>MUDE{ '\n' }A ROTA.</Text><Text style={s.heroCaption}>Uma imagem. Uma missão. Um novo jeito de começar.</Text></View></View>
          <View style={s.stickerWrap}><Animated.View style={[s.orbitSticker, { transform: [{ rotate: orbit.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]} /><View style={s.stickerCore}><Text style={s.stickerSymbol}>{dailyEdition.drawNumber}</Text></View></View>
          <View style={s.heroFooter}><Text style={s.heroFooterText}>{missionRevealed ? 'EDIÇÃO REVELADA' : 'UMA EDIÇÃO NOVA TODO DIA'}</Text><Text style={s.heroFooterDash}>✳</Text></View>
        </ImageBackground>
        {!missionRevealed ? <TouchableOpacity style={s.revealTab} onPress={revealMission} activeOpacity={0.86}><Text style={s.revealTabText}>ABRIR EDIÇÃO DE HOJE</Text><Text style={s.revealArrow}>↘</Text></TouchableOpacity> : <Animated.View style={[s.missionNote, { opacity: reveal, transform: [{ scale: reveal.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }, { translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }]}>
          <View style={s.noteTop}><Text style={s.noteCategory}>{dailyEdition.category} / {todayShort}</Text><Text style={s.noteReward}>+10 XP</Text></View>
          <Text style={s.noteTitle}>{dailyEdition.title}</Text><Text style={s.noteDetail}>{dailyEdition.detail}</Text>
          <TouchableOpacity style={[s.noteButton, missionDone && s.noteButtonDone]} onPress={() => { setProgressUpdatedAt(new Date().toISOString()); setMissionDone((value) => !value); }} activeOpacity={0.82}><Text style={s.noteButtonText}>{missionDone ? 'FEITA. BOA.' : 'MARCAR COMO FEITA'}</Text><Text style={s.noteButtonGlyph}>{missionDone ? '✓' : '→'}</Text></TouchableOpacity>
        </Animated.View>}
      </Animated.View>

      <View style={s.todayHead}><View><Text style={s.todayLabel}>SEU DIA, DO SEU JEITO</Text><Text style={s.todayCount}>{done.length}<Text style={s.todaySlash}> / </Text>{tasks.length}<Text style={s.todayCountWord}> passos</Text></Text></View><View style={s.xpStamp}><Text style={s.xpValue}>{points}</Text><Text style={s.xpLabel}>XP HOJE</Text></View></View>
      <View style={s.progressRail}>{tasks.map((task) => <View key={task.id} style={[s.progressPiece, done.includes(task.id) && s.progressPieceOn]} />)}</View>
      <View style={s.todaySection}><Text style={s.sectionTitle}>NO SEU RADAR</Text><Text style={s.sectionHint}>{progress}% do dia</Text></View>
      <TaskRows ids={[1, 2, 3, 4]} done={done} toggle={toggle} />

      <View style={s.nextPrompt}><Text style={s.nextIndex}>02</Text><View style={s.nextCopy}><Text style={s.nextLabel}>QUANDO BATER A VONTADE</Text><Text style={s.nextTitle}>Descubra seu próximo nível.</Text></View><TouchableOpacity onPress={() => setTab('Evolução')}><Text style={s.nextArrow}>↗</Text></TouchableOpacity></View>
      <View style={{ height: 28 }} />
    </ScrollView>}

    {tab === 'Rotina' && <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <PageHeading eyebrow="UM MAPA FLEXÍVEL" title="SEU RITMO." subtitle="Hábitos em blocos simples. Mude a ordem quando precisar." />
      <View style={s.weekRibbon}><Text style={s.weekTitle}>SEMANA {String(todayDate.getDate()).padStart(2, '0')}</Text><View style={s.weekDots}>{['S','T','Q','Q','S','S','D'].map((day, i) => <View key={i} style={s.weekDay}><Text style={[s.weekLetter, i === todayIndex && s.weekLetterToday]}>{day}</Text><View style={[s.weekDot, i === todayIndex && s.weekDotToday]}>{i === todayIndex ? <View style={s.weekDotCore} /> : null}</View></View>)}</View></View>
      <View style={s.routineHeading}><Text style={s.sectionTitle}>ANTES DE SAIR</Text><Text style={s.routineNumber}>01 — 02</Text></View><TaskRows ids={[1, 2]} done={done} toggle={toggle} />
      <View style={s.routineHeading}><Text style={s.sectionTitle}>QUANDO DER</Text><Text style={s.routineNumber}>03 — 04</Text></View><TaskRows ids={[3, 4]} done={done} toggle={toggle} />
      <View style={s.noteCard}><Text style={s.noteCardLabel}>ATALHO DE HOJE</Text><Text style={s.noteCardText}>Deixe o que você quer usar à vista. Menos etapas para começar.</Text></View>
    </ScrollView>}

    {tab === 'Evolução' && <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <PageHeading eyebrow="SEU MAPA / 05 FASES" title="CINCO FASES. SEU CAMINHO." subtitle="Cada etapa abre espaço para a próxima." />
      <View style={e.mapHero}>
        <View style={e.mapHeroCopy}><Text style={e.mapHeroEyebrow}>TRILHA DE EVOLUÇÃO</Text><Text style={e.mapHeroTitle}>{openPhaseCount}<Text style={e.mapHeroSlash}> / 05</Text></Text><Text style={e.mapHeroCaption}>FASES ABERTAS</Text></View>
        <Text style={e.mapHeroWord}>05</Text>
        <View style={e.mapHeroRoute} /><Text style={e.mapHeroXp}>{points} XP HOJE</Text>
      </View>
      <View style={e.pathHeading}><Text style={e.pathTitle}>ESCOLHA SUA PRÓXIMA FASE</Text><Text style={e.pathNote}>TOQUE PARA VER</Text></View>
      <View style={e.pathList}>
        {phases.map((phase, i) => <View key={phase.number}>
          <TouchableOpacity onPress={() => showNotice(phase.open ? `${phase.title}: fase aberta no seu ritmo.` : 'Conclua mais um passo para abrir esta fase.')} style={[e.pathRow, i % 2 === 1 && e.pathRowReverse]}>
            <View style={[e.pathNode, phase.open ? e.pathNodeOpen : e.pathNodeClosed]}><Text style={[e.pathNodeText, phase.open && e.pathNodeTextOpen]}>{phase.number}</Text></View>
            <View style={[e.pathCopy, phase.open ? e.pathCopyOpen : e.pathCopyClosed]}>
              <Text style={e.pathStatus}>{phase.open ? 'FASE ABERTA' : `FASE ${phase.number}`}</Text>
              <Text style={e.pathName}>{phase.title}</Text>
              <Text style={e.pathDescription}>{phase.description}</Text>
            </View>
          </TouchableOpacity>
          {i < phases.length - 1 ? <View style={[e.pathConnector, i % 2 === 0 ? e.pathConnectorRight : e.pathConnectorLeft]}><View style={e.pathConnectorLine} /></View> : null}
        </View>)}
      </View>
      <View style={e.historyHeading}><View><Text style={e.historyEyebrow}>REGISTROS / 30 DIAS</Text><Text style={e.historyTitle}>O CAMINHO QUE VOCÊ FEZ.</Text></View><View style={e.historyCount}><Text style={e.historyCountNumber}>{recentHistory.length}</Text><Text style={e.historyCountLabel}>{recentHistory.length === 1 ? 'DIA' : 'DIAS'}</Text></View></View>
      <View style={e.historySummary}><Text style={e.historySummaryValue}>{recordedSteps}</Text><Text style={e.historySummaryText}>passos marcados {recentHistory.length === 1 ? 'no último dia' : `nos últimos ${recentHistory.length || 30} dias`}</Text><Text style={e.historyMissionTotal}>{recentHistory.filter((record) => record.missionDone).length} MISSÕES FEITAS</Text></View>
      <View style={e.historyList}>
        {visibleHistory.map((record, index) => {
          const dayProgress = Math.round(record.done.length / tasks.length * 100);
          return <View key={record.local_date} style={[e.historyRow, index < visibleHistory.length - 1 && e.historyRowRule]}>
            <View style={e.historyDateBlock}><View style={[e.historyDot, (record.done.length > 0 || record.missionDone) && e.historyDotOn]} /><Text style={e.historyDate}>{historyDateLabel(record.local_date)}</Text></View>
            <View style={e.historyRecordCopy}><View style={e.historyRecordTop}><Text style={e.historyRecordSteps}>{record.done.length}/{tasks.length} PASSOS</Text><Text style={[e.historyMission, record.missionDone && e.historyMissionOn]}>{record.missionDone ? 'MISSÃO FEITA' : 'MISSÃO ABERTA'}</Text></View><View style={e.historyRail}><View style={[e.historyRailFill, { width: `${dayProgress}%` }]} /></View></View>
            <Text style={e.historyPercent}>{dayProgress}%</Text>
          </View>;
        })}
        {visibleHistory.length === 0 ? <View style={e.historyEmpty}><Text style={e.historyEmptyTitle}>SEU PRIMEIRO REGISTRO COMEÇA HOJE.</Text><Text style={e.historyEmptyBody}>Quando você marcar passos ou missões, eles aparecem por aqui.</Text></View> : null}
      </View>
      {recentHistory.length > 7 ? <TouchableOpacity onPress={() => setHistoryExpanded((value) => !value)} style={e.historyToggle}><Text style={e.historyToggleText}>{historyExpanded ? 'MOSTRAR MENOS' : 'VER MAIS DIAS'}</Text><Text style={e.historyToggleArrow}>{historyExpanded ? '↗' : '↘'}</Text></TouchableOpacity> : null}
      <TouchableOpacity accessibilityRole="button" onPress={() => setTab('Análise')} style={s.photoPrompt}><Text style={s.photoPromptTitle}>SEU PONTO DE PARTIDA</Text><Text style={s.photoPromptText}>Peça uma leitura de apresentação pessoal e receba ideias práticas para experimentar.</Text><Text style={s.photoPromptArrow}>ABRIR ANÁLISE VISUAL  ↗</Text></TouchableOpacity>
    </ScrollView>}

    {tab === 'Análise' && <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <PageHeading eyebrow="SEU OLHAR / SEM NOTAS" title="LEITURA VISUAL." subtitle="Sugestões de apresentação pessoal, feitas a partir de uma foto que você escolher." />
      <View style={a.introCard}><View style={a.introMark}><Text style={a.introMarkText}>01</Text></View><View style={a.introCopy}><Text style={a.introLabel}>UMA LEITURA, NÃO UM JULGAMENTO</Text><Text style={a.introText}>A análise observa cabelo, barba, roupa, pose e luz. Sem nota de aparência e sem diagnóstico de saúde.</Text></View></View>

      {!session ? <View style={a.gateCard}><Text style={a.gateKicker}>ACESSO PRIVADO</Text><Text style={a.gateTitle}>Sua foto fica ligada à sua conta.</Text><Text style={a.gateText}>Entre ou crie uma conta para enviar a imagem com segurança e ver seus resultados só aqui.</Text><TouchableOpacity style={a.gateButton} onPress={() => { setTab('Perfil'); setAccountMode(hasSupabaseConfig ? 'signin' : null); }}><Text style={a.gateButtonText}>{hasSupabaseConfig ? 'ENTRAR NA MINHA CONTA' : 'CONFIGURAR CONTA'}</Text><Text style={a.gateButtonArrow}>↗</Text></TouchableOpacity></View> : <>
        <View style={a.photoStage}>
          <Text style={a.sectionKicker}>ESCOLHA UMA FOTO / ATÉ 8 MB / 3 LEITURAS EM 24 H</Text>
          {analysisPhotoUri ? <Image source={{ uri: analysisPhotoUri }} resizeMode="cover" style={a.photoPreview} /> : <View style={a.photoEmpty}><Text style={a.photoGlyph}>◌</Text><Text style={a.photoEmptyTitle}>UM RETRATO SIMPLES JÁ BASTA.</Text><Text style={a.photoEmptyText}>Prefira boa luz, rosto e roupa visíveis. Evite filtros fortes e outras pessoas no enquadramento.</Text></View>}
          <View style={a.photoActions}><TouchableOpacity onPress={() => chooseAnalysisPhoto(false)} style={a.photoButton}><Text style={a.photoButtonText}>ESCOLHER FOTO</Text><Text style={a.photoButtonArrow}>↗</Text></TouchableOpacity><TouchableOpacity onPress={() => chooseAnalysisPhoto(true)} style={[a.photoButton, a.photoButtonAlt]}><Text style={a.photoButtonAltText}>TIRAR FOTO</Text><Text style={a.photoButtonAltArrow}>◎</Text></TouchableOpacity></View>
        </View>
        <TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: analysisConsent }} onPress={() => setAnalysisConsent((value) => !value)} style={a.consentRow}>
          <View style={[a.consentBox, analysisConsent && a.consentBoxChecked]}>{analysisConsent ? <Text style={a.consentCheck}>✓</Text> : null}</View>
          <Text style={a.consentText}>Autorizo o envio desta foto à OpenAI para gerar as sugestões. A cópia temporária no armazenamento do Men’s Evolution será apagada após o processamento; o resultado fica no meu histórico até eu apagá-lo.</Text>
        </TouchableOpacity>
        <View style={a.privacyNote}><Text style={a.privacyMark}>↳</Text><Text style={a.privacyText}>O envio e o processamento exigem conexão. A foto fica em armazenamento privado e é removida ao concluir, inclusive quando ocorre um erro.</Text></View>
        <TouchableOpacity disabled={analysisBusy || !analysisPhotoUri || !analysisConsent} onPress={submitAppearanceAnalysis} style={[a.analyzeButton, (analysisBusy || !analysisPhotoUri || !analysisConsent) && a.analyzeButtonDisabled]}><Text style={a.analyzeButtonText}>{analysisBusy ? 'LENDO A IMAGEM…' : 'FAZER MINHA LEITURA'}</Text><Text style={a.analyzeButtonArrow}>{analysisBusy ? '···' : '↗'}</Text></TouchableOpacity>
      </>}

      <View style={a.historyHeading}><View><Text style={a.sectionKicker}>SEU HISTÓRICO</Text><Text style={a.historyTitle}>IDEIAS PARA LEVAR.</Text></View><Text style={a.historyCount}>{analysisRecords.length}/10</Text></View>
      {analysisHistoryBusy ? <Text style={a.emptyHistory}>CARREGANDO SUAS LEITURAS…</Text> : analysisRecords.length === 0 ? <View style={a.emptyHistory}><Text style={a.emptyHistoryTitle}>AINDA SEM LEITURAS.</Text><Text style={a.emptyHistoryText}>Seus resultados concluídos aparecem aqui. A foto original não é guardada no histórico.</Text></View> : analysisRecords.map((record, index) => <View key={record.id} style={a.resultCard}>
        <View style={a.resultTop}><Text style={a.resultNumber}>LEITURA / {String(analysisRecords.length - index).padStart(2, '0')}</Text><Text style={a.resultDate}>{new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(record.created_at)).replace('.', '').toUpperCase()}</Text></View>
        <Text style={a.resultHeadline}>{record.result?.headline ?? 'UMA IDEIA PARA SEU PRÓXIMO PASSO.'}</Text>
        {record.result?.observations?.map((item, i) => <View key={`o-${i}`} style={a.resultLine}><Text style={a.resultDot}>·</Text><Text style={a.resultBody}>{item}</Text></View>)}
        {record.result?.suggestions?.map((item, i) => <View key={`s-${i}`} style={a.suggestionRow}><Text style={a.suggestionIndex}>{String(i + 1).padStart(2, '0')}</Text><View style={a.suggestionCopy}><Text style={a.suggestionTitle}>{item.title}</Text><Text style={a.suggestionDetail}>{item.detail}</Text></View></View>)}
        {record.result?.reminder ? <Text style={a.resultReminder}>{record.result.reminder}</Text> : null}
        <TouchableOpacity onPress={() => deleteAppearanceRecord(record.id)} style={a.deleteResult}><Text style={a.deleteResultText}>APAGAR ESTE RESULTADO  ×</Text></TouchableOpacity>
      </View>)}
    </ScrollView>}

    {tab === 'Perfil' && <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <PageHeading eyebrow="SEU ESPAÇO" title="DO SEU JEITO." subtitle="Ajuste o app para combinar com você." />
      <View style={s.profileBanner}><Text style={s.profileMono}>{profile.name.trim().split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</Text><View style={s.profileIdentity}><Text style={s.profileTitle}>{profile.name}</Text><Text style={s.profileSubtitle}>Foco: {profile.goal}</Text></View><TouchableOpacity onPress={openProfileEditor}><Text style={s.editLink}>EDITAR ↗</Text></TouchableOpacity></View>
      <View style={s.accountCard}><View style={s.accountCardTop}><Text style={s.accountKicker}>CONTA / SINCRONIZAÇÃO</Text><View style={[s.accountDot, session && s.accountDotOn]} /></View><Text style={s.accountTitle}>{session ? 'SUA EVOLUÇÃO ESTÁ CONECTADA.' : 'LEVE SEU CAMINHO COM VOCÊ.'}</Text><Text style={s.accountDescription}>{session ? session.user.email : 'Entre ou crie uma conta para sincronizar perfil e progresso diário entre aparelhos.'}</Text><View style={s.accountActions}>{session ? <><TouchableOpacity onPress={retrySync} style={[s.accountButton, s.accountButtonHalf]}><Text style={s.accountButtonText}>{cloudSyncPaused ? 'RETOMAR SYNC' : 'SINCRONIZAR'}</Text><Text style={s.accountButtonArrow}>↻</Text></TouchableOpacity><TouchableOpacity onPress={signOut} style={[s.accountButton, s.accountButtonHalf, s.accountButtonGhost]}><Text style={s.accountButtonText}>SAIR</Text><Text style={s.accountButtonArrow}>↗</Text></TouchableOpacity></> : <TouchableOpacity onPress={() => { setAuthEmail(''); setAuthPassword(''); setAuthMessage(''); setAuthError(false); setAccountMode('signup'); }} style={s.accountButton}><Text style={s.accountButtonText}>{hasSupabaseConfig ? 'CRIAR CONTA / ENTRAR' : 'PREPARAR CONTA'}</Text><Text style={s.accountButtonArrow}>↗</Text></TouchableOpacity>}</View><Text style={s.accountFootnote}>{session ? cloudSyncPaused ? 'CÓPIAS LOCAIS / SINCRONIZAÇÃO PAUSADA' : 'DADOS NESTE APARELHO + NA NUVEM' : 'SEM CONTA, NADA SAI DESTE APARELHO'}</Text></View>
      <View style={d.dataCard}>
        <View style={d.dataHeading}><Text style={d.dataKicker}>PRIVACIDADE / SEUS DADOS</Text><Text style={d.dataGlyph}>↘</Text></View>
        <Text style={d.dataTitle}>APAGAR DADOS DA NUVEM.</Text>
        <Text style={d.dataDescription}>Remove do Men’s Evolution seu perfil sincronizado, registros diários, resultados da análise e fotos temporárias pendentes.</Text>
        {session ? <>
          {cloudSyncPaused ? <Text style={d.dataStatus}>SINCRONIZAÇÃO PAUSADA NESTE APARELHO.</Text> : null}
          {!dataDeleteExpanded ? <TouchableOpacity disabled={dataDeleteBusy} onPress={() => setDataDeleteExpanded(true)} style={d.dataAction}><Text style={d.dataActionText}>REVISAR E APAGAR</Text><Text style={d.dataActionArrow}>↗</Text></TouchableOpacity> : <View style={d.dataConfirm}>
            <Text style={d.dataConfirmTitle}>ANTES DE APAGAR</Text>
            <Text style={d.dataConfirmText}>Sua conta e os dados salvos neste aparelho continuam. A sincronização deste aparelho será pausada. Outros aparelhos ainda podem ter cópias locais e reenviá-las se sincronizarem. Dados processados pela OpenAI seguem as políticas próprias do serviço.</Text>
            <TouchableOpacity disabled={dataDeleteBusy} onPress={eraseSyncedData} style={[d.dataAction, d.dataActionDanger, dataDeleteBusy && d.dataActionDisabled]}><Text style={d.dataActionText}>{dataDeleteBusy ? 'APAGANDO…' : 'APAGAR DA NUVEM'}</Text><Text style={d.dataActionArrow}>{dataDeleteBusy ? '···' : '×'}</Text></TouchableOpacity>
            <TouchableOpacity disabled={dataDeleteBusy} onPress={() => setDataDeleteExpanded(false)} style={d.dataCancel}><Text style={d.dataCancelText}>CANCELAR</Text></TouchableOpacity>
          </View>}
        </> : <TouchableOpacity onPress={() => { setAuthEmail(''); setAuthPassword(''); setAuthMessage(''); setAuthError(false); setAccountMode('signin'); }} style={d.dataAction}><Text style={d.dataActionText}>ENTRAR PARA CONTINUAR</Text><Text style={d.dataActionArrow}>↗</Text></TouchableOpacity>}
      </View>
      <View style={s.todaySection}><Text style={s.sectionTitle}>PREFERÊNCIAS</Text></View>
      {[['IDIOMA', 'Português (Brasil)'], ['LEMBRETES', 'Ativados'], ['PRIVACIDADE', 'Seus dados são seus'], ['AJUDA', 'Suporte e respostas']].map(([label, value], i) => <TouchableOpacity key={label} style={[s.preferenceRow, i < 3 && s.rowRule]} onPress={() => showNotice(`${label}: configuração em breve.`)}><Text style={s.preferenceLabel}>{label}</Text><Text style={s.preferenceValue}>{value}</Text><Text style={s.preferenceArrow}>↗</Text></TouchableOpacity>)}
      <View style={s.profilePlan}><Text style={s.profilePlanLabel}>PLANO ATUAL</Text><Text style={s.profilePlanTitle}>Evolução gratuita</Text><Text style={s.profilePlanSub}>Seu primeiro passo começa aqui.</Text></View>
    </ScrollView>}

    {notice ? <View style={s.toast}><Text style={s.toastDot}>•</Text><Text style={s.toastText}>{notice}</Text></View> : null}
    <View style={s.nav}>{([['Início','01'],['Rotina','02'],['Análise','03'],['Evolução','04'],['Perfil','05']] as const).map(([label, number]) => <TouchableOpacity accessibilityRole="tab" accessibilityState={{ selected: tab === label }} key={label} style={[s.navItem, s.navItemCompact]} onPress={() => setTab(label)}><View style={[s.navDash, tab === label && s.navDashActive]} /><Text style={[s.navNumber, tab === label && s.navNumberActive]}>{number}</Text><Text style={[s.navLabel, s.navLabelCompact, tab === label && s.navActive]}>{label}</Text></TouchableOpacity>)}</View>
  </SafeAreaView>;
}

const s = StyleSheet.create({
  authPage:{flexGrow:1,paddingHorizontal:25,paddingTop:20,paddingBottom:72},authIntro:{marginTop:72,marginBottom:38},authTitle:{fontFamily:'sans-serif-condensed',fontWeight:'900',fontSize:58,lineHeight:54,letterSpacing:-2,color:paper,marginTop:13},authForm:{gap:10},authInfo:{padding:20,backgroundColor:'rgba(18,62,57,0.88)',borderTopLeftRadius:5,borderTopRightRadius:32,borderBottomLeftRadius:32,borderBottomRightRadius:5},authInfoMark:{fontSize:23,fontWeight:'900',color:lime},authInfoTitle:{fontFamily:'sans-serif-condensed',fontWeight:'900',fontSize:18,color:paper,marginTop:12},authInfoText:{fontSize:11,lineHeight:17,color:'#D6E0D3',marginTop:8},authMessage:{fontSize:10,lineHeight:15,fontWeight:'700',color:lime,marginVertical:5},authMessageError:{color:'#FF9D7F'},authButtonBusy:{opacity:.6},authSwitch:{alignSelf:'center',paddingVertical:18},authSwitchText:{fontSize:8,fontWeight:'900',letterSpacing:.8,color:'#D4E0D3'},authBack:{position:'absolute',bottom:18,left:25,padding:10},authBackText:{fontSize:8,fontWeight:'900',letterSpacing:.8,color:'#D4E0D3'},
  accountCard:{marginBottom:26,padding:16,backgroundColor:'#E4EAD9',borderTopLeftRadius:5,borderTopRightRadius:31,borderBottomLeftRadius:31,borderBottomRightRadius:5},accountCardTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},accountKicker:{fontSize:8,fontWeight:'900',letterSpacing:1.2,color:green},accountDot:{width:8,height:8,borderRadius:4,backgroundColor:'#B5BDB0'},accountDotOn:{backgroundColor:green},accountTitle:{fontFamily:'sans-serif-condensed',fontWeight:'900',fontSize:20,lineHeight:22,color:ink,marginTop:12},accountDescription:{fontSize:10,lineHeight:15,color:'#54655A',marginTop:6},accountActions:{marginTop:14,flexDirection:'row',gap:8},accountButton:{minHeight:42,flex:1,backgroundColor:ink,borderTopLeftRadius:5,borderTopRightRadius:20,borderBottomLeftRadius:20,borderBottomRightRadius:5,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:13},accountButtonHalf:{flex:1},accountButtonGhost:{backgroundColor:green},accountButtonText:{fontSize:8,fontWeight:'900',letterSpacing:.8,color:paper},accountButtonArrow:{fontSize:16,fontWeight:'900',color:lime},accountFootnote:{fontSize:7,fontWeight:'900',letterSpacing:.8,color:green,marginTop:11},
  safe:{flex:1,backgroundColor:paper},
  topBar:{height:61,paddingHorizontal:22,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderBottomColor:line},
  wordmark:{flexDirection:'row',alignItems:'center',gap:9},wordmarkME:{fontFamily:'sans-serif-condensed',fontSize:19,fontWeight:'900',color:green,letterSpacing:-1},wordmarkName:{fontSize:10,fontWeight:'900',letterSpacing:1.3,color:ink},profileLink:{flexDirection:'row',alignItems:'center',gap:7},profileLinkText:{fontSize:8,fontWeight:'900',letterSpacing:1.1,color:green},profileArrow:{fontSize:17,color:orange,fontWeight:'900'},
  content:{paddingHorizontal:22,paddingTop:20,paddingBottom:35},eyebrow:{fontSize:9,fontWeight:'900',letterSpacing:1.7,color:green},pageHeading:{marginBottom:24},pageTitle:{fontFamily:'sans-serif-condensed',fontWeight:'900',fontSize:38,lineHeight:38,letterSpacing:-.7,color:ink,marginTop:9},pageSubtitle:{fontSize:12,color:quiet,marginTop:8,lineHeight:17},homeIntro:{marginBottom:19},dateStamp:{fontSize:9,fontWeight:'900',letterSpacing:1.5,color:green,marginBottom:9},homeTitle:{fontFamily:'sans-serif-condensed',fontWeight:'900',fontSize:47,lineHeight:42,letterSpacing:-1.8,color:ink},homeSubtitle:{fontSize:12,color:quiet,marginTop:9},
  heroStage:{marginBottom:27},heroImage:{height:395,justifyContent:'space-between',padding:18},heroImageShape:{borderTopLeftRadius:75,borderTopRightRadius:26,borderBottomLeftRadius:28,borderBottomRightRadius:82},heroTopline:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},heroBrand:{fontSize:8,fontWeight:'900',letterSpacing:1.1,color:ink,backgroundColor:'rgba(246,241,231,0.76)',paddingHorizontal:10,paddingVertical:7,borderRadius:30,overflow:'hidden'},heroDate:{fontSize:9,fontWeight:'900',letterSpacing:1,color:ink,backgroundColor:lime,paddingHorizontal:10,paddingVertical:7,borderRadius:20,overflow:'hidden'},heroCopyPlate:{width:'50%',marginTop:37,padding:12,backgroundColor:'rgba(246,241,231,0.92)',borderTopLeftRadius:4,borderTopRightRadius:27,borderBottomLeftRadius:27,borderBottomRightRadius:4},heroCopy:{width:'100%'},heroKicker:{fontSize:8,fontWeight:'900',letterSpacing:1.4,color:green,marginBottom:9},heroHeadline:{fontFamily:'sans-serif-condensed',fontWeight:'900',fontSize:40,lineHeight:38,letterSpacing:-1.4,color:ink},heroCaption:{fontSize:11,lineHeight:16,color:ink,marginTop:10,width:'88%'},stickerWrap:{position:'absolute',right:18,bottom:78,width:64,height:64,alignItems:'center',justifyContent:'center'},orbitSticker:{width:64,height:64,borderWidth:1,borderStyle:'dashed',borderColor:orange,borderRadius:32},stickerCore:{position:'absolute',width:40,height:40,borderRadius:20,backgroundColor:orange,alignItems:'center',justifyContent:'center'},stickerSymbol:{fontFamily:'sans-serif-condensed',fontSize:13,fontWeight:'900',color:paper},heroFooter:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:'auto'},heroFooterText:{fontSize:8,fontWeight:'900',letterSpacing:1.25,color:ink,backgroundColor:'rgba(246,241,231,0.8)',paddingHorizontal:10,paddingVertical:7,borderRadius:20,overflow:'hidden'},heroFooterDash:{fontSize:20,color:orange},revealTab:{alignSelf:'flex-end',marginTop:-18,marginRight:15,backgroundColor:orange,paddingHorizontal:18,paddingVertical:12,borderRadius:24,borderTopLeftRadius:6,flexDirection:'row',alignItems:'center',gap:13,elevation:4},revealTabText:{fontSize:9,fontWeight:'900',letterSpacing:1.1,color:paper},revealArrow:{fontSize:17,fontWeight:'900',color:paper},
  missionNote:{marginTop:-24,marginHorizontal:13,padding:17,paddingTop:21,backgroundColor:lime,borderTopLeftRadius:8,borderTopRightRadius:34,borderBottomLeftRadius:34,borderBottomRightRadius:8,elevation:3},noteTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},noteCategory:{fontSize:8,fontWeight:'900',letterSpacing:1.1,color:green},noteReward:{fontSize:9,fontWeight:'900',letterSpacing:.7,color:ink,backgroundColor:'#EFF8D1',borderRadius:16,paddingHorizontal:10,paddingVertical:6},noteTitle:{fontFamily:'sans-serif-condensed',fontSize:25,lineHeight:27,fontWeight:'900',color:ink,marginTop:11},noteDetail:{fontSize:11,lineHeight:16,color:'#36584D',marginTop:6},noteButton:{marginTop:13,backgroundColor:ink,paddingHorizontal:13,paddingVertical:11,borderRadius:19,borderTopLeftRadius:5,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},noteButtonDone:{backgroundColor:green},noteButtonText:{fontSize:8,fontWeight:'900',letterSpacing:1,color:paper},noteButtonGlyph:{fontSize:16,color:paper,fontWeight:'900'},
  todayHead:{flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between',marginBottom:12},todayLabel:{fontSize:8,fontWeight:'900',letterSpacing:1.6,color:green,marginBottom:5},todayCount:{fontFamily:'sans-serif-condensed',fontWeight:'900',fontSize:31,color:ink},todaySlash:{fontSize:21,color:orange},todayCountWord:{fontSize:14,color:green},xpStamp:{backgroundColor:ink,borderTopLeftRadius:18,borderBottomRightRadius:18,paddingHorizontal:14,paddingVertical:8,alignItems:'center'},xpValue:{fontFamily:'sans-serif-condensed',fontSize:18,fontWeight:'900',color:lime},xpLabel:{fontSize:7,fontWeight:'900',letterSpacing:1,color:paper,marginTop:1},progressRail:{height:6,flexDirection:'row',gap:4,marginBottom:20},progressPiece:{flex:1,backgroundColor:'#DFE0D3',borderRadius:8},progressPieceOn:{backgroundColor:orange},todaySection:{flexDirection:'row',alignItems:'baseline',justifyContent:'space-between',marginBottom:5},sectionTitle:{fontFamily:'sans-serif-condensed',fontSize:20,fontWeight:'900',letterSpacing:.1,color:ink},sectionHint:{fontSize:9,fontWeight:'900',letterSpacing:.7,color:green},taskList:{marginBottom:22},taskRow:{minHeight:66,flexDirection:'row',alignItems:'center',gap:12},rowRule:{borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:line},taskIndex:{fontFamily:'sans-serif-condensed',fontSize:17,fontWeight:'900',color:orange,width:27},taskIndexDone:{color:green},taskCopy:{flex:1},taskName:{fontSize:13,fontWeight:'800',color:ink},taskNameDone:{color:quiet,textDecorationLine:'line-through'},taskMeta:{fontSize:8,fontWeight:'800',letterSpacing:.8,color:quiet,marginTop:4},taskCheck:{width:23,height:23,borderRadius:12,borderWidth:1.5,borderColor:'#9CAB93',alignItems:'center',justifyContent:'center'},taskCheckDone:{backgroundColor:green,borderColor:green},checkGlyph:{color:paper,fontSize:13,fontWeight:'900'},nextPrompt:{minHeight:70,backgroundColor:'#E8E8D9',borderTopLeftRadius:27,borderBottomRightRadius:27,flexDirection:'row',alignItems:'center',paddingHorizontal:15,gap:13,marginTop:6},nextIndex:{fontFamily:'sans-serif-condensed',fontSize:31,fontWeight:'900',color:orange},nextCopy:{flex:1},nextLabel:{fontSize:7,fontWeight:'900',letterSpacing:1.1,color:green},nextTitle:{fontFamily:'sans-serif-condensed',fontSize:17,fontWeight:'900',color:ink,marginTop:3},nextArrow:{fontSize:24,color:green,fontWeight:'900'},
  nav:{height:71,borderTopWidth:1,borderTopColor:line,backgroundColor:paper,flexDirection:'row',alignItems:'center',justifyContent:'space-around',paddingBottom:5},navItem:{minWidth:62,alignItems:'center',justifyContent:'center',gap:2},navItemCompact:{minWidth:0,flex:1},navDash:{width:18,height:3,borderRadius:3,backgroundColor:'transparent',marginBottom:2},navDashActive:{width:28,backgroundColor:orange},navNumber:{fontSize:7,fontWeight:'900',letterSpacing:1,color:'#A4AAA0'},navNumberActive:{color:green},navLabel:{fontSize:9,color:quiet,fontWeight:'700'},navLabelCompact:{fontSize:8},navActive:{color:ink,fontWeight:'900'},
  weekRibbon:{backgroundColor:ink,paddingHorizontal:17,paddingVertical:17,borderTopLeftRadius:26,borderBottomRightRadius:26,marginBottom:29},weekTitle:{fontSize:8,fontWeight:'900',letterSpacing:1.3,color:lime},weekDots:{flexDirection:'row',justifyContent:'space-between',marginTop:15},weekDay:{alignItems:'center',gap:7},weekLetter:{fontSize:9,fontWeight:'800',color:'#B6C5B9'},weekLetterToday:{color:lime},weekDot:{width:22,height:22,borderRadius:11,borderWidth:1,borderColor:'#637C6D',alignItems:'center',justifyContent:'center'},weekDotToday:{backgroundColor:orange,borderColor:orange},weekDotCore:{width:5,height:5,borderRadius:3,backgroundColor:paper},routineHeading:{flexDirection:'row',alignItems:'baseline',justifyContent:'space-between',marginBottom:1},routineNumber:{fontSize:8,fontWeight:'900',letterSpacing:1,color:orange},noteCard:{backgroundColor:'#E3F0D0',padding:17,borderTopLeftRadius:8,borderTopRightRadius:27,borderBottomLeftRadius:27,borderBottomRightRadius:8},noteCardLabel:{fontSize:8,fontWeight:'900',letterSpacing:1.3,color:green},noteCardText:{fontFamily:'sans-serif-condensed',fontSize:19,fontWeight:'800',color:ink,marginTop:8,lineHeight:23},
  rankBand:{backgroundColor:ink,padding:18,borderTopLeftRadius:31,borderBottomRightRadius:31,marginBottom:29},rankLabel:{fontSize:8,fontWeight:'900',letterSpacing:1.3,color:lime},rankNumber:{fontFamily:'sans-serif-condensed',fontSize:52,fontWeight:'900',color:paper,marginTop:5},rankUnit:{fontSize:18,color:lime},rankTrack:{height:5,backgroundColor:'#385F53',borderRadius:4,marginTop:6},rankFill:{height:5,backgroundColor:orange,borderRadius:4},rankFoot:{fontSize:9,color:'#C7D5C8',marginTop:9},treeHeading:{flexDirection:'row',alignItems:'baseline',justifyContent:'space-between',marginBottom:15},treeHint:{fontSize:7,fontWeight:'900',letterSpacing:.9,color:quiet},tree:{position:'relative',paddingVertical:2,marginBottom:24},treeSpine:{position:'absolute',top:22,bottom:23,left:21,width:2,backgroundColor:'#C5D3B2'},treeNodeRow:{minHeight:76,flexDirection:'row',alignItems:'center',gap:12},treeNodeOffset:{marginLeft:22},treeNode:{width:44,height:44,borderRadius:24,alignItems:'center',justifyContent:'center',zIndex:1},treeNodeOpen:{backgroundColor:orange,borderWidth:3,borderColor:'#F9B383'},treeNodeLocked:{backgroundColor:paper,borderWidth:1.5,borderColor:'#BFC8B5'},treeNodeNumber:{fontFamily:'sans-serif-condensed',fontSize:14,fontWeight:'900',color:quiet},treeNodeNumberOpen:{color:paper},treeNodeCopy:{flex:1},treeNodeTitle:{fontSize:10,fontWeight:'900',letterSpacing:1,color:ink},treeNodeDescription:{fontSize:9,color:quiet,marginTop:3,lineHeight:13},treeNodeStatus:{fontSize:6,fontWeight:'900',letterSpacing:.5,color:green},photoPrompt:{paddingTop:17,borderTopWidth:1,borderTopColor:line},photoPromptTitle:{fontFamily:'sans-serif-condensed',fontSize:19,fontWeight:'900',color:ink},photoPromptText:{fontSize:11,color:quiet,lineHeight:16,marginTop:5},photoPromptArrow:{fontSize:8,fontWeight:'900',letterSpacing:1,color:orange,marginTop:11},
  setupSafe:{flex:1,backgroundColor:ink},setupBackdrop:{flex:1},setupTint:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(18,62,57,0.18)'},easterHotspot:{position:'absolute',right:17,top:'42%',width:38,height:38,zIndex:5,alignItems:'center',justifyContent:'center'},easterMark:{width:26,height:26,borderRadius:13,borderWidth:1,borderColor:'rgba(243,90,43,0.75)',backgroundColor:'rgba(18,62,57,0.82)',alignItems:'center',justifyContent:'center'},easterGlyph:{fontSize:12,color:orange,fontWeight:'900'},easterNote:{position:'absolute',right:61,top:'41.3%',maxWidth:215,backgroundColor:'rgba(18,62,57,0.95)',paddingHorizontal:13,paddingVertical:9,borderTopLeftRadius:3,borderTopRightRadius:16,borderBottomLeftRadius:16,borderBottomRightRadius:3,borderWidth:1,borderColor:'rgba(221,242,138,0.3)',zIndex:4},easterNoteKicker:{fontSize:6,fontWeight:'900',letterSpacing:1.1,color:lime},easterNoteText:{fontFamily:'sans-serif-condensed',fontSize:14,fontWeight:'900',color:paper,marginTop:4},setupPage:{flexGrow:1,justifyContent:'space-between',paddingHorizontal:24,paddingTop:20,paddingBottom:26},setupTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},setupWordmark:{flexDirection:'row',alignItems:'center',gap:9},setupMark:{fontFamily:'sans-serif-condensed',fontSize:20,fontWeight:'900',letterSpacing:-1,color:orange},setupBrand:{fontSize:9,fontWeight:'900',letterSpacing:1.2,color:paper},setupIndex:{fontSize:7,fontWeight:'900',letterSpacing:1,color:lime},setupIntro:{marginTop:46,marginBottom:26},setupEyebrow:{fontSize:8,fontWeight:'900',letterSpacing:1.7,color:lime,marginBottom:11},setupTitle:{fontFamily:'sans-serif-condensed',fontSize:52,lineHeight:56,fontWeight:'900',letterSpacing:-1.4,color:paper},setupSubtitle:{fontSize:12,lineHeight:18,color:'#C3D2C5',marginTop:19,maxWidth:300},setupForm:{marginTop:3},setupLabel:{fontSize:8,fontWeight:'900',letterSpacing:1.25,color:lime,marginTop:19,marginBottom:8},setupInput:{height:48,borderBottomWidth:1,borderBottomColor:'#668176',color:paper,fontSize:19,fontWeight:'700',paddingHorizontal:2,paddingVertical:7},primaryGoal:{minHeight:76,backgroundColor:lime,borderTopLeftRadius:25,borderTopRightRadius:5,borderBottomLeftRadius:5,borderBottomRightRadius:25,paddingHorizontal:15,paddingVertical:12,justifyContent:'space-between'},primaryGoalMeta:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},primaryGoalKicker:{fontSize:7,fontWeight:'900',letterSpacing:1,color:green},primaryGoalNumber:{fontSize:7,fontWeight:'900',letterSpacing:.8,color:green},primaryGoalBottom:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:8},primaryGoalTitle:{fontFamily:'sans-serif-condensed',fontSize:21,fontWeight:'900',letterSpacing:.4,color:ink},primaryGoalArrow:{fontSize:20,fontWeight:'900',color:orange},secondaryGoalHeading:{flexDirection:'row',alignItems:'baseline',justifyContent:'space-between',marginTop:16,marginBottom:8},secondaryGoalTitle:{fontSize:8,fontWeight:'900',letterSpacing:1.1,color:lime},secondaryGoalHint:{fontSize:7,fontWeight:'900',letterSpacing:.8,color:'#B6C9B8'},secondaryGoals:{width:'100%',flexDirection:'row',justifyContent:'space-between'},secondaryGoalWrap:{width:'31.8%',flexGrow:0,flexShrink:0},secondaryGoal:{width:'100%',minHeight:66,backgroundColor:'rgba(26,80,71,0.94)',borderTopLeftRadius:16,borderTopRightRadius:4,borderBottomLeftRadius:4,borderBottomRightRadius:16,paddingHorizontal:8,paddingVertical:9,justifyContent:'space-between',borderWidth:1,borderColor:'rgba(221,242,138,0.14)'},secondaryGoalNumber:{fontFamily:'sans-serif-condensed',fontSize:11,fontWeight:'900',color:'#9BB3A2'},secondaryGoalLabel:{fontSize:7,fontWeight:'900',letterSpacing:.2,color:paper},secondaryGoalArrow:{alignSelf:'flex-end',fontSize:13,color:'#A7BAAB',fontWeight:'700'},setupError:{fontSize:10,fontWeight:'700',color:'#FF9D7F',marginTop:8},setupBottom:{marginTop:22},setupPrivacy:{fontSize:9,color:'#B6C9B8',marginBottom:12},setupButton:{minHeight:52,backgroundColor:orange,borderTopLeftRadius:5,borderTopRightRadius:25,borderBottomLeftRadius:25,borderBottomRightRadius:5,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:17},setupButtonText:{fontSize:9,fontWeight:'900',letterSpacing:1,color:paper},setupButtonArrow:{fontSize:19,color:paper,fontWeight:'900'},setupCancel:{alignSelf:'center',paddingVertical:12},setupCancelText:{fontSize:8,fontWeight:'900',letterSpacing:1,color:'#C3D2C5'},profileLoading:{flex:1,alignItems:'center',justifyContent:'center'},profileLoadingText:{fontSize:9,fontWeight:'900',letterSpacing:1.3,color:green},
  profileBanner:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:18,borderTopWidth:1,borderBottomWidth:1,borderColor:line,marginBottom:25},profileMono:{fontFamily:'sans-serif-condensed',fontWeight:'900',fontSize:21,color:orange},profileIdentity:{flex:1},profileTitle:{fontFamily:'sans-serif-condensed',fontWeight:'900',fontSize:18,color:ink},profileSubtitle:{fontSize:9,color:quiet,marginTop:3},editLink:{fontSize:7,fontWeight:'900',letterSpacing:.8,color:green},preferenceRow:{minHeight:58,flexDirection:'row',alignItems:'center',gap:10},preferenceLabel:{width:86,fontSize:8,fontWeight:'900',letterSpacing:1,color:green},preferenceValue:{flex:1,fontSize:11,fontWeight:'700',color:ink},preferenceArrow:{fontSize:15,color:orange,fontWeight:'900'},profilePlan:{marginTop:28,paddingTop:17,borderTopWidth:1,borderTopColor:line},profilePlanLabel:{fontSize:8,fontWeight:'900',letterSpacing:1.3,color:green},profilePlanTitle:{fontFamily:'sans-serif-condensed',fontSize:18,fontWeight:'900',color:ink,marginTop:6},profilePlanSub:{fontSize:10,color:quiet,marginTop:3},toast:{position:'absolute',bottom:82,left:22,right:22,flexDirection:'row',alignItems:'center',gap:8,backgroundColor:ink,paddingHorizontal:14,paddingVertical:12,borderTopLeftRadius:18,borderBottomRightRadius:18},toastDot:{fontSize:18,color:lime},toastText:{flex:1,color:paper,fontSize:10,fontWeight:'700'}
});

const a = StyleSheet.create({
  introCard:{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:'#E5EBDD',padding:15,marginBottom:22,borderTopLeftRadius:5,borderTopRightRadius:28,borderBottomLeftRadius:28,borderBottomRightRadius:5},
  introMark:{width:42,height:42,alignItems:'center',justifyContent:'center',backgroundColor:orange,borderTopLeftRadius:15,borderTopRightRadius:5,borderBottomLeftRadius:5,borderBottomRightRadius:15,transform:[{rotate:'-7deg'}]},introMarkText:{fontFamily:'sans-serif-condensed',fontWeight:'900',fontSize:15,color:paper},introCopy:{flex:1},introLabel:{fontSize:7,fontWeight:'900',letterSpacing:1.1,color:green},introText:{fontSize:10,lineHeight:15,color:ink,marginTop:4},
  gateCard:{backgroundColor:ink,padding:19,marginBottom:23,borderTopLeftRadius:34,borderTopRightRadius:5,borderBottomLeftRadius:5,borderBottomRightRadius:34},gateKicker:{fontSize:8,fontWeight:'900',letterSpacing:1.4,color:lime},gateTitle:{fontFamily:'sans-serif-condensed',fontWeight:'900',fontSize:25,lineHeight:27,color:paper,marginTop:9},gateText:{fontSize:10,lineHeight:16,color:'#D2DDD1',marginTop:7},gateButton:{minHeight:44,marginTop:15,paddingHorizontal:13,flexDirection:'row',alignItems:'center',justifyContent:'space-between',backgroundColor:orange,borderTopLeftRadius:5,borderTopRightRadius:20,borderBottomLeftRadius:20,borderBottomRightRadius:5},gateButtonText:{fontSize:8,fontWeight:'900',letterSpacing:.8,color:paper},gateButtonArrow:{fontSize:17,fontWeight:'900',color:paper},
  photoStage:{padding:15,backgroundColor:'#EBE8DE',borderTopLeftRadius:5,borderTopRightRadius:30,borderBottomLeftRadius:30,borderBottomRightRadius:5},sectionKicker:{fontSize:7,fontWeight:'900',letterSpacing:1.2,color:green},photoEmpty:{height:226,marginTop:12,alignItems:'center',justifyContent:'center',padding:23,backgroundColor:'#E0E7DC',borderTopLeftRadius:5,borderTopRightRadius:46,borderBottomLeftRadius:46,borderBottomRightRadius:5},photoGlyph:{fontSize:44,color:orange,fontWeight:'300'},photoEmptyTitle:{fontFamily:'sans-serif-condensed',fontSize:18,fontWeight:'900',color:ink,marginTop:5,textAlign:'center'},photoEmptyText:{fontSize:9,lineHeight:14,color:quiet,textAlign:'center',marginTop:6,maxWidth:230},photoPreview:{height:320,width:'100%',marginTop:12,backgroundColor:'#D8D8CA',borderTopLeftRadius:5,borderTopRightRadius:46,borderBottomLeftRadius:46,borderBottomRightRadius:5},photoActions:{flexDirection:'row',gap:8,marginTop:11},photoButton:{flex:1,minHeight:43,paddingHorizontal:11,backgroundColor:ink,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderTopLeftRadius:4,borderTopRightRadius:19,borderBottomLeftRadius:19,borderBottomRightRadius:4},photoButtonText:{fontSize:7,fontWeight:'900',letterSpacing:.65,color:paper},photoButtonArrow:{fontSize:15,color:lime,fontWeight:'900'},photoButtonAlt:{backgroundColor:paper,borderWidth:1,borderColor:'#D4D5C8'},photoButtonAltText:{fontSize:7,fontWeight:'900',letterSpacing:.65,color:green},photoButtonAltArrow:{fontSize:15,color:orange,fontWeight:'900'},
  consentRow:{flexDirection:'row',alignItems:'flex-start',gap:10,paddingVertical:15},consentBox:{width:21,height:21,borderWidth:1.5,borderColor:green,alignItems:'center',justifyContent:'center',marginTop:1},consentBoxChecked:{backgroundColor:green},consentCheck:{fontSize:14,fontWeight:'900',color:paper},consentText:{flex:1,fontSize:9,lineHeight:14,color:ink},privacyNote:{flexDirection:'row',gap:9,padding:12,backgroundColor:'#F0E6D8',borderLeftWidth:3,borderLeftColor:orange},privacyMark:{fontSize:16,fontWeight:'900',color:orange},privacyText:{flex:1,fontSize:8,lineHeight:13,color:'#626D63'},analyzeButton:{minHeight:52,marginTop:12,paddingHorizontal:16,backgroundColor:orange,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderTopLeftRadius:5,borderTopRightRadius:26,borderBottomLeftRadius:26,borderBottomRightRadius:5},analyzeButtonDisabled:{opacity:.48},analyzeButtonText:{fontSize:9,fontWeight:'900',letterSpacing:1,color:paper},analyzeButtonArrow:{fontSize:20,fontWeight:'900',color:paper},
  historyHeading:{marginTop:29,marginBottom:13,flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between'},historyTitle:{fontFamily:'sans-serif-condensed',fontSize:22,lineHeight:23,fontWeight:'900',color:ink,marginTop:4},historyCount:{fontSize:9,fontWeight:'900',letterSpacing:.8,color:orange},emptyHistory:{padding:17,backgroundColor:'#EBE8DE',borderTopLeftRadius:5,borderTopRightRadius:24,borderBottomLeftRadius:24,borderBottomRightRadius:5},emptyHistoryTitle:{fontFamily:'sans-serif-condensed',fontWeight:'900',fontSize:18,color:ink},emptyHistoryText:{fontSize:9,lineHeight:14,color:quiet,marginTop:5},
  resultCard:{marginBottom:14,padding:15,backgroundColor:'#ECE9DF',borderTopLeftRadius:5,borderTopRightRadius:28,borderBottomLeftRadius:28,borderBottomRightRadius:5},resultTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingBottom:9,borderBottomWidth:1,borderBottomColor:'#D8D8CA'},resultNumber:{fontSize:7,fontWeight:'900',letterSpacing:1,color:green},resultDate:{fontSize:7,fontWeight:'900',color:orange},resultHeadline:{fontFamily:'sans-serif-condensed',fontSize:22,lineHeight:24,fontWeight:'900',color:ink,marginTop:13,marginBottom:8},resultLine:{flexDirection:'row',gap:6,marginTop:5},resultDot:{fontSize:18,lineHeight:16,color:orange},resultBody:{flex:1,fontSize:9,lineHeight:14,color:'#526057'},suggestionRow:{flexDirection:'row',gap:10,paddingVertical:11,borderTopWidth:1,borderTopColor:'#D8D8CA'},suggestionIndex:{fontFamily:'sans-serif-condensed',fontSize:14,fontWeight:'900',color:orange},suggestionCopy:{flex:1},suggestionTitle:{fontSize:9,fontWeight:'900',color:ink},suggestionDetail:{fontSize:9,lineHeight:14,color:quiet,marginTop:3},resultReminder:{fontSize:9,lineHeight:14,fontStyle:'italic',color:green,paddingTop:9,borderTopWidth:1,borderTopColor:'#D8D8CA'},deleteResult:{alignSelf:'flex-end',paddingTop:13,paddingLeft:12},deleteResultText:{fontSize:7,fontWeight:'900',letterSpacing:.8,color:'#9A5944'},
});

const d = StyleSheet.create({
  dataCard:{padding:16,marginTop:1,backgroundColor:'#EEE7DA',borderTopLeftRadius:30,borderTopRightRadius:5,borderBottomLeftRadius:5,borderBottomRightRadius:30},
  dataHeading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},dataKicker:{fontSize:7,fontWeight:'900',letterSpacing:1.2,color:'#9A5944'},dataGlyph:{fontSize:20,fontWeight:'900',color:orange},
  dataTitle:{fontFamily:'sans-serif-condensed',fontWeight:'900',fontSize:22,lineHeight:24,color:ink,marginTop:9},dataDescription:{fontSize:9,lineHeight:14,color:'#626D63',marginTop:5},dataStatus:{fontSize:7,fontWeight:'900',letterSpacing:.9,color:green,marginTop:13},
  dataAction:{minHeight:42,marginTop:14,paddingHorizontal:13,backgroundColor:ink,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderTopLeftRadius:4,borderTopRightRadius:19,borderBottomLeftRadius:19,borderBottomRightRadius:4},dataActionText:{fontSize:8,fontWeight:'900',letterSpacing:.8,color:paper},dataActionArrow:{fontSize:16,fontWeight:'900',color:lime},
  dataConfirm:{marginTop:15,padding:13,backgroundColor:'#F6F1E7',borderLeftWidth:3,borderLeftColor:orange},dataConfirmTitle:{fontSize:7,fontWeight:'900',letterSpacing:1,color:'#9A5944'},dataConfirmText:{fontSize:9,lineHeight:14,color:'#59655C',marginTop:6},dataActionDanger:{backgroundColor:'#9A4936'},dataActionDisabled:{opacity:.55},dataCancel:{alignSelf:'center',padding:11},dataCancelText:{fontSize:7,fontWeight:'900',letterSpacing:1,color:green},
});

const e = StyleSheet.create({
  historyHeading:{marginTop:26,marginBottom:11,flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between'},historyEyebrow:{fontSize:7,fontWeight:'900',letterSpacing:1.25,color:green},historyTitle:{fontFamily:'sans-serif-condensed',fontSize:20,lineHeight:21,fontWeight:'900',color:ink,marginTop:5},historyCount:{width:43,height:43,borderRadius:22,backgroundColor:orange,alignItems:'center',justifyContent:'center',transform:[{rotate:'-7deg'}]},historyCountNumber:{fontFamily:'sans-serif-condensed',fontWeight:'900',fontSize:17,lineHeight:18,color:paper},historyCountLabel:{fontSize:5,fontWeight:'900',letterSpacing:.8,color:paper},historySummary:{minHeight:51,flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:12,marginBottom:8,backgroundColor:'#E9E5D9',borderTopLeftRadius:4,borderTopRightRadius:18,borderBottomLeftRadius:18,borderBottomRightRadius:4},historySummaryValue:{fontFamily:'sans-serif-condensed',fontWeight:'900',fontSize:24,color:green},historySummaryText:{flex:1,fontSize:8,fontWeight:'700',color:quiet},historyMissionTotal:{fontSize:6,fontWeight:'900',letterSpacing:.5,color:orange},historyList:{paddingHorizontal:12,backgroundColor:'#F0ECE2',borderTopLeftRadius:4,borderTopRightRadius:24,borderBottomLeftRadius:24,borderBottomRightRadius:4},historyRow:{minHeight:57,flexDirection:'row',alignItems:'center',gap:9,paddingVertical:9},historyRowRule:{borderBottomWidth:1,borderBottomColor:'#DAD9CB'},historyDateBlock:{width:69,flexDirection:'row',alignItems:'center',gap:6},historyDot:{width:6,height:6,borderRadius:4,backgroundColor:'#B8BCAF'},historyDotOn:{backgroundColor:orange},historyDate:{fontSize:7,fontWeight:'900',letterSpacing:.3,color:ink},historyRecordCopy:{flex:1},historyRecordTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:6},historyRecordSteps:{fontSize:7,fontWeight:'900',letterSpacing:.5,color:green},historyMission:{fontSize:6,fontWeight:'900',letterSpacing:.25,color:'#93998E'},historyMissionOn:{color:orange},historyRail:{height:3,backgroundColor:'#D9DCCF',borderRadius:4,overflow:'hidden'},historyRailFill:{height:3,backgroundColor:green,borderRadius:4},historyPercent:{width:29,textAlign:'right',fontFamily:'sans-serif-condensed',fontSize:11,fontWeight:'900',color:ink},historyEmpty:{paddingVertical:19,paddingHorizontal:5},historyEmptyTitle:{fontFamily:'sans-serif-condensed',fontSize:15,fontWeight:'900',color:ink},historyEmptyBody:{fontSize:9,lineHeight:14,color:quiet,marginTop:5},historyToggle:{alignSelf:'flex-end',flexDirection:'row',alignItems:'center',gap:10,paddingVertical:12},historyToggleText:{fontSize:7,fontWeight:'900',letterSpacing:.9,color:green},historyToggleArrow:{fontSize:15,fontWeight:'900',color:orange},
  mapHero:{height:153,backgroundColor:'#7899AA',padding:18,marginBottom:27,overflow:'hidden',borderTopLeftRadius:42,borderTopRightRadius:10,borderBottomLeftRadius:10,borderBottomRightRadius:42,justifyContent:'center'},
  mapHeroCopy:{zIndex:2},mapHeroEyebrow:{fontSize:8,fontWeight:'900',letterSpacing:1.35,color:paper},mapHeroTitle:{fontFamily:'sans-serif-condensed',fontSize:57,fontWeight:'900',lineHeight:59,color:paper,marginTop:3},mapHeroSlash:{fontSize:22,color:lime},mapHeroCaption:{fontSize:8,fontWeight:'900',letterSpacing:1.1,color:ink,marginTop:-2},mapHeroWord:{position:'absolute',right:13,top:-14,fontFamily:'sans-serif-condensed',fontSize:116,lineHeight:125,fontWeight:'900',letterSpacing:-5,color:'rgba(18,62,57,0.15)'},mapHeroRoute:{position:'absolute',right:8,bottom:37,width:158,height:4,backgroundColor:orange,borderRadius:4,transform:[{rotate:'-34deg'}]},mapHeroXp:{position:'absolute',right:18,bottom:14,fontSize:8,fontWeight:'900',letterSpacing:1,color:paper},
  pathHeading:{flexDirection:'row',alignItems:'baseline',justifyContent:'space-between',marginBottom:12},pathTitle:{fontFamily:'sans-serif-condensed',fontSize:16,fontWeight:'900',letterSpacing:.2,color:ink},pathNote:{fontSize:7,fontWeight:'900',letterSpacing:.8,color:quiet},pathList:{paddingBottom:8},
  pathRow:{minHeight:76,flexDirection:'row',alignItems:'center',gap:11},pathRowReverse:{flexDirection:'row-reverse'},pathNode:{width:52,height:52,borderRadius:27,alignItems:'center',justifyContent:'center',zIndex:2},pathNodeOpen:{backgroundColor:orange,borderWidth:3,borderColor:'#F8B08E'},pathNodeClosed:{backgroundColor:paper,borderWidth:1.5,borderColor:'#A9BBC0'},pathNodeText:{fontFamily:'sans-serif-condensed',fontSize:15,fontWeight:'900',color:quiet},pathNodeTextOpen:{color:paper},pathCopy:{flex:1,minHeight:62,paddingHorizontal:13,paddingVertical:9,justifyContent:'center'},pathCopyOpen:{backgroundColor:'#E2EDCF',borderTopLeftRadius:5,borderTopRightRadius:24,borderBottomLeftRadius:24,borderBottomRightRadius:5},pathCopyClosed:{backgroundColor:'#E8ECE9',borderTopLeftRadius:24,borderTopRightRadius:5,borderBottomLeftRadius:5,borderBottomRightRadius:24},pathStatus:{fontSize:7,fontWeight:'900',letterSpacing:.8,color:green},pathName:{fontFamily:'sans-serif-condensed',fontSize:16,fontWeight:'900',letterSpacing:.2,color:ink,marginTop:2},pathDescription:{fontSize:9,lineHeight:13,color:quiet,marginTop:2},pathConnector:{width:'70%',height:24,justifyContent:'center'},pathConnectorRight:{alignSelf:'flex-end',marginRight:'5%'},pathConnectorLeft:{alignSelf:'flex-start',marginLeft:'5%'},pathConnectorLine:{height:1,borderBottomWidth:2,borderStyle:'dashed',borderColor:orange,transform:[{rotate:'8deg'}]},
});
