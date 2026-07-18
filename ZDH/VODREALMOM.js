// --- 21����ѡ��������Դ ---
const RESOURCE_SITES = `
�Ƿ���Դ,http://ffzy5.tv/api.php/provide/vod/
������Դ,https://wolongzyw.com/api.php/provide/vod/
�����Դ,https://api.zuidapi.com/api.php/provide/vod/
������Դ,https://bfzyapi.com/api.php/provide/vod/
������Դ,https://jszyapi.com/api.php/provide/vod/
�޾���Դ,https://api.wujinapi.com/api.php/provide/vod/
��Ӱ����,http://caiji.dyttzyapi.com/api.php/provide/vod/
������Դ,https://cj.rycjapi.com/api.php/provide/vod/
��ţ��Դ,https://www.hongniuzy2.com/api.php/provide/vod/
������Դ,https://api.guangsuapi.com/api.php/provide/vod/
IKUN��Դ,https://ikunzyapi.com/api.php/provide/vod/
�ſ���Դ,https://api.ukuapi.com/api.php/provide/vod/
������Դ,https://www.huyaapi.com/api.php/provide/vod/
������Դ,http://api.xinlangapi.com/xinlangapi.php/provide/vod/
������Դ,https://cj.lziapi.com/api.php/provide/vod/
������Դ,https://jyzyapi.com/provide/vod/
������Դ,https://lovedan.net/api.php/provide/vod/
ę́��Դ,https://caiji.maotaizy.cc/api.php/provide/vod/
������Դ,https://dbzy.tv/api.php/provide/vod/
�ٲ���Դ,https://subocaiji.com/api.php/provide/vod/
Ʈ����Դ,https://p2100.net/api.php/provide/vod/
`;

const CHINESE_NUM_MAP = {
  'һ': 1, '��': 2, '��': 3, '��': 4, '��': 5,
  '��': 6, '��': 7, '��': 8, '��': 9, 'ʮ': 10
};

WidgetMetadata = {
  id: "vod_realmom",
  title: "VOD ����Դ",
  icon: "https://raw.githubusercontent.com/MakkaPakka518/FW/refs/heads/main/widgets/tubiao/makka.png",
  version: "1.0.3",
  requiredVersion: "0.0.1",
  description: "��ȡVOD������Դ(�ں�21��VODԴ)",
  author: "????????????????????",
  site: "https://t.me/MakkaPakkaOvO",
  globalParams: [
    {
      name: "multiSource",
      title: "�Ƿ����þۺ�����",
      type: "enumeration",
      enumOptions: [
        { title: "����", value: "enabled" },
        { title: "����", value: "disabled" }
      ]
    },
    {
      name: "VodData",
      title: "CSV��ʽ��Դ����",
      type: "input",
      value: RESOURCE_SITES
    }
  ],
  modules: [
    {
      id: "loadResource",
      title: "������Դ",
      functionName: "loadResource",
      type: "stream",
      params: [],
    }
  ],
};

// --- �������ߺ��� ---

const isM3U8Url = (url) => url?.toLowerCase().includes('m3u8') || false;

function extractSeasonInfo(seriesName) {
  if (!seriesName) return { baseName: seriesName, seasonNumber: 1 };
  const chineseMatch = seriesName.match(/��([һ�����������߰˾�ʮ\d]+)[����]/);
  if (chineseMatch) {
    const val = chineseMatch[1];
    const seasonNum = CHINESE_NUM_MAP[val] || parseInt(val) || 1;
    const baseName = seriesName.replace(/��[һ�����������߰˾�ʮ\d]+[����]/, '').trim();
    return { baseName, seasonNumber: seasonNum };
  }
  const digitMatch = seriesName.match(/(.+?)(\d+)$/);
  if (digitMatch) {
    return { baseName: digitMatch[1].trim(), seasonNumber: parseInt(digitMatch[2]) || 1 };
  }
  return { baseName: seriesName.trim(), seasonNumber: 1 };
}

/**
 * �޸ĺ����ȡ�߼�������ֱ�ӹ��˼��������Ƿ��ش���ǵ����м����Ա㻺��
 */
function extractPlayInfoForCache(item, siteTitle, type) {
  const { vod_name, vod_play_url, vod_play_from, vod_remarks = '' } = item;
  if (!vod_name || !vod_play_url) return [];

  const playSources = vod_play_url.replace(/#+$/, '').split('$$$');
  const sourceNames = (vod_play_from || '').split('$$$');
  
  return playSources.flatMap((playSource, i) => {
    const sourceName = sourceNames[i] || 'Ĭ��Դ';
    const isTV = playSource.includes('#');
    const results = [];

    if (type === 'tv' && isTV) {
      const episodes = playSource.split('#').filter(Boolean);
      episodes.forEach(ep => {
        const [epName, url] = ep.split('$');
        if (url && isM3U8Url(url)) {
          // ��ȡ���ּ������ں�����ȷ����
          const epMatch = epName.match(/��(\d+)��/);
          results.push({
            name: siteTitle,
            description: `${vod_name} - ${epName}${vod_remarks ? ' - ' + vod_remarks : ''} - [${sourceName}]`,
            url: url.trim(),
            _ep: epMatch ? parseInt(epMatch[1]) : null // �ڲ����
          });
        }
      });
    } else if (type === 'movie' && !isTV) {
      const firstM3U8 = playSource.split('#').find(v => isM3U8Url(v.split('$')[1]));
      if (firstM3U8) {
        const [quality, url] = firstM3U8.split('$');
        const qualityText = quality.toLowerCase().includes('tc') ? '���Ȱ�' : '��Ƭ';
        results.push({
          name: siteTitle,
          description: `${vod_name} - ${qualityText} - [${sourceName}]`,
          url: url.trim()
        });
      }
    }
    return results;
  });
}

function parseResourceSites(VodData) {
  const parseLine = (line) => {
    const [title, value] = line.split(',').map(s => s.trim());
    // ��΢�Ż�����ֹ�� .php ��β�Ľӿڱ�ǿ�Ƽ��� '/'
    if (title && value?.startsWith('http')) {
      return { title, value: (value.endsWith('/') || value.includes('.php') || value.includes('/json')) ? value : value + '/' };
    }
    return null;
  };
  try {
    const trimmed = VodData?.trim() || "";
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      return JSON.parse(trimmed).map(s => ({ title: s.title || s.name, value: s.url || s.value })).filter(s => s.title && s.value);
    }
    return trimmed.split('\n').map(parseLine).filter(Boolean);
  } catch (e) {
    return RESOURCE_SITES.trim().split('\n').map(parseLine).filter(Boolean);
  }
}

// --- ����ں��� ---

async function loadResource(params) {
  const { seriesName, type = 'tv', season, episode, multiSource, VodData } = params;
  if (multiSource !== "enabled" || !seriesName) return [];

  const resourceSites = parseResourceSites(VodData);
  const { baseName, seasonNumber } = extractSeasonInfo(seriesName);
  const targetSeason = season ? parseInt(season) : seasonNumber;
  const targetEpisode = episode ? parseInt(episode) : null;

  // 1. ���Դӻ����ȡ
  const cacheKey = `vod_exact_cache_${baseName}_s${targetSeason}_${type}`;
  let allResources = [];
  
  try {
    const cached = Widget.storage.get(cacheKey);
    if (cached && Array.isArray(cached)) {
      console.log(`���л���: ${cacheKey}`);
      allResources = cached;
    }
  } catch (e) {}

  // 2. ���û�л��棬������������
  if (allResources.length === 0) {
    const fetchTasks = resourceSites.map(async (site) => {
      try {
        const separator = site.value.includes("?") ? "&" : "?";
        const url = site.value + separator + "ac=detail&wd=" + encodeURIComponent(baseName.trim());
        const response = await Widget.http.get(url, { timeout: 10000 });
        const list = response?.data?.list;
        if (!Array.isArray(list)) return [];

        return list.flatMap(item => {
          const itemInfo = extractSeasonInfo(item.vod_name);
          
          // ��ȷƥ���߼�
          if (itemInfo.baseName !== baseName || itemInfo.seasonNumber !== targetSeason) {
            return [];
          }
          
          return extractPlayInfoForCache(item, site.title, type);
        });
      } catch (error) {
        return [];
      }
    });

    const results = await Promise.all(fetchTasks);
    const merged = results.flat();

    // URL ȥ��
    const urlSet = new Set();
    allResources = merged.filter(res => {
      if (urlSet.has(res.url)) return false;
      urlSet.add(res.url);
      return true;
    });

    // д�뻺�棨��Ч��3Сʱ = 10800�룩
    if (allResources.length > 0) {
      try { Widget.storage.set(cacheKey, allResources, 10800); } catch (e) {}
    }
  }

  // 3. ������أ����� targetEpisode �������ľ�ȷ����
  if (type === 'tv' && targetEpisode !== null) {
    return allResources.filter(res => {
      // ���ȸ�����ȡʱ�� _ep ����ƥ�䣬�����������������ƥ��
      if (res._ep !== undefined && res._ep !== null) {
        return res._ep === targetEpisode;
      }
      return res.description.includes(`��${targetEpisode}��`);
    });
  }

  return allResources;
}
