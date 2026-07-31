import { useState, useMemo } from 'react';
import { PlayerRow } from '@/components/PlayerRow';
import { UploadArea, type LoadedFiles } from '@/components/UploadArea';
import { DonateButton } from '@/components/DonateButton';
import { parseLootCSV } from '@/lib/parseCSV';
import { parseBankLog } from '@/lib/parseBankLog';
import { checkPlayerDeaths, ProxyUnavailableError } from '@/lib/albionApi';
import { useI18n } from '@/hooks/useI18n';
import type { PlayerData, SortMode } from '@/types/loot';
import { Shield, Upload, Search, ArrowUpDown, Filter, Skull, AlertCircle, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function Home() {
  const { t, lang, setLang } = useI18n();
  const [data, setData] = useState<PlayerData[] | null>(null);
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('value');
  const [tierFilter, setTierFilter] = useState<number[]>([]);
  const [guildFilter, setGuildFilter] = useState<string[]>([]);
  const [files, setFiles] = useState<LoadedFiles>({ lootCsv: null, bankTsv: null });
  const [checkingDeaths, setCheckingDeaths] = useState(false);
  const [checkProgress, setCheckProgress] = useState({ current: 0, total: 0 });
  const [notification, setNotification] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  const handleParse = () => {
    if (!files.lootCsv) return;

    let bankLog: Map<string, Map<string, number>> | undefined;
    if (files.bankTsv) {
      bankLog = parseBankLog(files.bankTsv.text);
    }

    const parsed = parseLootCSV(files.lootCsv.text, bankLog);
    setData(parsed);
    setSearch('');
  };

  const handleReset = () => {
    setData(null);
    setFiles({ lootCsv: null, bankTsv: null });
    setSearch('');
    setTierFilter([]);
    setGuildFilter([]);
    setNotification(null);
  };

  const toggleTier = (tier: number) => {
    setTierFilter(prev =>
      prev.includes(tier)
        ? prev.filter(t => t !== tier)
        : [...prev, tier]
    );
  };

  const toggleGuild = (guild: string) => {
    setGuildFilter(prev =>
      prev.includes(guild)
        ? prev.filter(g => g !== guild)
        : [...prev, guild]
    );
  };

  const uniqueGuilds = useMemo(() => {
    if (!data) return [];
    const guilds = new Set<string>();
    data.forEach(p => { if (p.guild) guilds.add(p.guild); });
    return Array.from(guilds).sort();
  }, [data]);

  const handleCheckDeaths = async () => {
    if (!data) return;
    setCheckingDeaths(true);
    setNotification(null);

    // Only check players from selected guilds (or all if none selected)
    let playersToCheck = [...data];
    if (guildFilter.length > 0) {
      playersToCheck = playersToCheck.filter(p => guildFilter.includes(p.guild));
    }

    const total = playersToCheck.length;
    setCheckProgress({ current: 0, total });

    // Build a map of player indices for updating
    const playerIndexMap = new Map<string, number>();
    data.forEach((p, idx) => playerIndexMap.set(p.player, idx));

    const updatedData = [...data];
    let proxyError = false;
    let lostCount = 0;

    for (let i = 0; i < playersToCheck.length; i++) {
      setCheckProgress({ current: i + 1, total });
      const player = playersToCheck[i];
      try {
        const lostIds = await checkPlayerDeaths(
          player.player,
          player.items.map(it => ({ item_id: it.item_id, timestamp: it.timestamp }))
        );
        if (lostIds.size > 0) {
          const idx = playerIndexMap.get(player.player)!;
          updatedData[idx] = {
            ...updatedData[idx],
            items: updatedData[idx].items.map(it =>
              lostIds.has(it.item_id) ? { ...it, isLost: true } : it
            ),
          };
          lostCount += lostIds.size;
        }
        // Delay between players to avoid rate limiting
        if (i < playersToCheck.length - 1) {
          await new Promise(r => setTimeout(r, 500));
        }
      } catch (e) {
        if (e instanceof ProxyUnavailableError) {
          proxyError = true;
          break;
        }
        console.error(`Failed to check deaths for ${player.player}:`, e);
      }
    }

    setData(updatedData);
    setCheckingDeaths(false);

    if (proxyError) {
      setNotification({
        type: 'error',
        message: lang === 'ru'
          ? 'Не удалось обратиться к Albion API: нет прокси. Локально запускайте через npm run dev, на проде — деплой на Netlify (не статикой).'
          : 'Cannot reach Albion API: no proxy. Locally use npm run dev; in production deploy to Netlify (not as static files).',
      });
    } else if (lostCount > 0) {
      setNotification({
        type: 'success',
        message: lang === 'ru'
          ? `Найдено ${lostCount} утерянных предметов`
          : `Found ${lostCount} lost items`,
      });
    } else {
      setNotification({
        type: 'success',
        message: lang === 'ru'
          ? 'Утерянных предметов не найдено'
          : 'No lost items found',
      });
    }
  };

  const filteredData = useMemo(() => {
    if (!data) return [];
    let filtered = data.filter(p =>
      p.player.toLowerCase().includes(search.toLowerCase()) ||
      p.guild.toLowerCase().includes(search.toLowerCase())
    );

    switch (sortMode) {
      case 'value':
        filtered.sort((a, b) => b.total_value - a.total_value);
        break;
      case 'items':
        filtered.sort((a, b) => b.item_count - a.item_count);
        break;
      case 'name':
        filtered.sort((a, b) => a.player.localeCompare(b.player));
        break;
    }

    return filtered;
  }, [data, search, sortMode]);

  const totalValue = useMemo(() => (data || []).reduce((sum, p) => sum + p.total_value, 0), [data]);
  const totalItems = useMemo(() => (data || []).reduce((sum, p) => sum + p.item_count, 0), [data]);

  const formatValue = (v: number) => {
    if (v >= 1000000) return `${(v / 1000000).toFixed(2)}M`;
    if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
    return v.toString();
  };

  if (!data) {
    return (
      <div className="h-screen overflow-hidden bg-[#0d0d0d] text-gray-200 flex flex-col">
        <header className="border-b border-gray-800 bg-[#111] shrink-0">
          <div className="max-w-7xl mx-auto px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={handleReset} className="p-0 bg-transparent border-0 cursor-pointer hover:opacity-80 transition-opacity">
                  <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
                </button>
                <div>
                  <button onClick={handleReset} className="p-0 bg-transparent border-0 cursor-pointer hover:opacity-80 transition-opacity text-left">
                    <h1 className="text-xl font-bold text-amber-500">{t('site_title')}</h1>
                  </button>
                  <p className="text-sm text-gray-500">{t('upload_description')}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-[#1a1a1a] border border-gray-700 rounded-lg p-1">
                  <Button
                    variant={lang === 'ru' ? 'default' : 'ghost'}
                    size="sm"
                    className={`h-7 text-xs px-3 ${lang === 'ru' ? 'bg-amber-600 hover:bg-amber-700' : 'text-gray-400 hover:text-white'}`}
                    onClick={() => setLang('ru')}
                  >
                    RU
                  </Button>
                  <Button
                    variant={lang === 'en' ? 'default' : 'ghost'}
                    size="sm"
                    className={`h-7 text-xs px-3 ${lang === 'en' ? 'bg-amber-600 hover:bg-amber-700' : 'text-gray-400 hover:text-white'}`}
                    onClick={() => setLang('en')}
                  >
                    EN
                  </Button>
                </div>
                <DonateButton />
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 flex flex-col items-center justify-center px-6 overflow-hidden">
          <div className="w-full max-w-5xl space-y-2">
            <div className="text-center space-y-1">
              <Shield className="w-10 h-10 mx-auto text-gray-700" />
              <h2 className="text-lg font-semibold text-gray-300">{t('analyzer_title')}</h2>
              <p className="text-sm text-gray-500">
                {t('upload_description')}
              </p>
            </div>
            <UploadArea files={files} onFilesChange={setFiles} onParse={handleParse} />
            {/* Discord footer */}
            <div className="text-center pt-1">
              <p className="text-sm text-gray-500">
                {lang === 'ru' ? 'По вопросам рекламы и предложениям:' : 'For advertising and suggestions:'}{' '}
                <a
                  href="https://discord.com/users/1100160532960518285"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:text-indigo-300 hover:underline font-medium"
                >
                  Discord
                </a>
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-gray-200">
      <header className="border-b border-gray-800 bg-[#111] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button onClick={handleReset} className="p-0 bg-transparent border-0 cursor-pointer hover:opacity-80 transition-opacity">
                <img src="/logo.png" alt="Logo" className="w-7 h-7 object-contain" />
              </button>
              <div>
                <button onClick={handleReset} className="p-0 bg-transparent border-0 cursor-pointer hover:opacity-80 transition-opacity text-left">
                  <h1 className="text-lg font-bold text-amber-500">{t('site_title')}</h1>
                </button>
                <p className="text-sm text-gray-500">
                  {files.lootCsv?.filename}
                  {files.bankTsv && ` + ${files.bankTsv.filename}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-[#1a1a1a] border border-gray-700 rounded-lg p-1">
                  <Button
                    variant={lang === 'ru' ? 'default' : 'ghost'}
                    size="sm"
                    className={`h-7 text-xs px-3 ${lang === 'ru' ? 'bg-amber-600 hover:bg-amber-700' : 'text-gray-400 hover:text-white'}`}
                    onClick={() => setLang('ru')}
                  >
                    RU
                  </Button>
                  <Button
                    variant={lang === 'en' ? 'default' : 'ghost'}
                    size="sm"
                    className={`h-7 text-xs px-3 ${lang === 'en' ? 'bg-amber-600 hover:bg-amber-700' : 'text-gray-400 hover:text-white'}`}
                    onClick={() => setLang('en')}
                  >
                    EN
                  </Button>
                </div>
                <DonateButton />
              </div>
              <div className="flex items-center gap-5">
                <div className="flex gap-6 text-sm">
                  <div className="text-center">
                    <p className="font-bold text-emerald-400 text-base">{formatValue(totalValue)}</p>
                    <p className="text-xs text-gray-500">{t('silver')}</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-blue-400 text-base">{totalItems}</p>
                    <p className="text-xs text-gray-500">{t('items')}</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-yellow-400 text-base">{data.length}</p>
                    <p className="text-xs text-gray-500">{t('players')}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-gray-700 bg-[#1a1a1a] hover:bg-[#222] text-gray-300 h-9 text-sm"
                  onClick={handleReset}
                >
                  <Upload className="w-4 h-4 mr-1.5" />
                  {t('new_file')}
                </Button>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
              <Input
                placeholder={t('search_placeholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-10 text-sm bg-[#1a1a1a] border-gray-700 text-gray-200 placeholder:text-gray-600"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={sortMode === 'value' ? 'default' : 'outline'}
                size="sm"
                className={`h-10 text-sm ${sortMode === 'value' ? 'bg-amber-600 hover:bg-amber-700' : 'border-gray-700 bg-[#1a1a1a] text-gray-400'}`}
                onClick={() => setSortMode('value')}
              >
                <ArrowUpDown className="w-4 h-4 mr-1.5" />
                {t('sort_price')}
              </Button>
              <Button
                variant={sortMode === 'items' ? 'default' : 'outline'}
                size="sm"
                className={`h-10 text-sm ${sortMode === 'items' ? 'bg-amber-600 hover:bg-amber-700' : 'border-gray-700 bg-[#1a1a1a] text-gray-400'}`}
                onClick={() => setSortMode('items')}
              >
                <Filter className="w-4 h-4 mr-1.5" />
                {t('sort_count')}
              </Button>
              <Button
                variant={sortMode === 'name' ? 'default' : 'outline'}
                size="sm"
                className={`h-10 text-sm ${sortMode === 'name' ? 'bg-amber-600 hover:bg-amber-700' : 'border-gray-700 bg-[#1a1a1a] text-gray-400'}`}
                onClick={() => setSortMode('name')}
              >
                {t('sort_name')}
              </Button>
            </div>
            {/* Tier filter */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500 mr-1">{lang === 'ru' ? 'Тир:' : 'Tier:'}</span>
              {[4, 5, 6, 7, 8].map((tier) => (
                <Button
                  key={tier}
                  variant={tierFilter.includes(tier) ? 'default' : 'outline'}
                  size="sm"
                  className={`h-8 w-8 p-0 text-xs ${tierFilter.includes(tier) ? 'bg-amber-600 hover:bg-amber-700' : 'border-gray-700 bg-[#1a1a1a] text-gray-400'}`}
                  onClick={() => toggleTier(tier)}
                >
                  T{tier}
                </Button>
              ))}
              {tierFilter.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-gray-500 hover:text-gray-300 ml-1"
                  onClick={() => setTierFilter([])}
                >
                  {lang === 'ru' ? 'Сброс' : 'Reset'}
                </Button>
              )}
            </div>
            {/* Guild filter */}
            {uniqueGuilds.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-xs text-gray-500 mr-1">{t('guild_filter')}</span>
                {uniqueGuilds.map((guild) => (
                  <Button
                    key={guild}
                    variant={guildFilter.includes(guild) ? 'default' : 'outline'}
                    size="sm"
                    className={`h-8 text-xs px-2 ${guildFilter.includes(guild) ? 'bg-amber-600 hover:bg-amber-700' : 'border-gray-700 bg-[#1a1a1a] text-gray-400'}`}
                    onClick={() => toggleGuild(guild)}
                    title={guild}
                  >
                    {guild.length > 12 ? guild.slice(0, 12) + '…' : guild}
                  </Button>
                ))}
                {guildFilter.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-gray-500 hover:text-gray-300 ml-1"
                    onClick={() => setGuildFilter([])}
                  >
                    {lang === 'ru' ? 'Сброс' : 'Reset'}
                  </Button>
                )}
              </div>
            )}
            {/* Death check */}
            <Button
              variant="outline"
              size="sm"
              className="h-10 text-sm border-gray-700 bg-[#1a1a1a] hover:bg-[#222] text-gray-300"
              onClick={handleCheckDeaths}
              disabled={checkingDeaths}
            >
              <Skull className="w-4 h-4 mr-1.5" />
              {checkingDeaths
                ? `${checkProgress.current}/${checkProgress.total}`
                : t('check_deaths')}
            </Button>
          </div>

          {/* Notification */}
          {notification && (
            <div className={`mt-3 flex items-center gap-2 px-4 py-2 rounded text-sm ${
              notification.type === 'error'
                ? 'bg-red-900/30 border border-red-800 text-red-300'
                : 'bg-emerald-900/30 border border-emerald-800 text-emerald-300'
            }`}>
              {notification.type === 'error' ? (
                <AlertCircle className="w-4 h-4 shrink-0" />
              ) : null}
              <span className="flex-1">{notification.message}</span>
              <button
                onClick={() => setNotification(null)}
                className="p-1 hover:bg-white/10 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center gap-5 pb-3 border-b border-gray-800 text-sm font-semibold text-gray-500 uppercase tracking-wider">
          <div className="w-64 shrink-0">{t('name_header')}</div>
          <div className="flex-1">{t('items_header')}</div>
        </div>

        <div>
          {filteredData.map((player) => (
            <PlayerRow
              key={player.player}
              player={player}
              rank={data.indexOf(player)}
              tierFilter={tierFilter}
            />
          ))}
          {filteredData.length === 0 && (
            <div className="text-center py-20 text-gray-600">
              <Shield className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-base">{t('no_players')}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
