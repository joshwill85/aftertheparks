import conditions from "@/data/weather/weatherapi-conditions.json";
import type { WeatherIconKey } from "@/lib/weather/types";

export type WeatherStoryTone =
  | "bright"
  | "calm"
  | "cozy"
  | "rainy"
  | "stormy"
  | "foggy"
  | "caution";

export interface WeatherApiConditionMapItem {
  code: number;
  dayLabel: string;
  nightLabel: string;
  weatherApiIconId: number;
  afterTheParksDayIcon: WeatherIconKey;
  afterTheParksNightIcon: WeatherIconKey;
  storyTone: WeatherStoryTone;
  altText: string;
  ariaLabel: string;
}

type WeatherApiCondition = {
  code: number;
  day: string;
  night: string;
  icon: number;
};

function iconForCode(code: number, isDay: boolean): WeatherIconKey {
  if (code === 1000) return isDay ? "sunny_day" : "clear_night";
  if (code === 1003) return isDay ? "partly_cloudy_day" : "partly_cloudy_night";
  if (code === 1006) return "cloudy";
  if (code === 1009) return "overcast";
  if ([1012, 1015, 1018, 1021, 1024, 1045, 1048].includes(code)) return "dust";
  if (code === 1030) return "mist";
  if ([1033, 1036, 1039, 1042].includes(code)) return "smoke";
  if ([1135, 1147].includes(code)) return "fog";
  if ([1063, 1180].includes(code)) return "patchy_rain";
  if ([1072, 1150, 1153].includes(code)) return "drizzle";
  if ([1168, 1171].includes(code)) return "freezing_drizzle";
  if (code === 1183) return "light_rain";
  if ([1186, 1189].includes(code)) return "moderate_rain";
  if ([1192, 1195].includes(code)) return "heavy_rain";
  if ([1198, 1201].includes(code)) return "freezing_rain";
  if ([1240, 1243].includes(code)) return "rain_shower";
  if (code === 1246) return "torrential_rain";
  if (code === 1087) return "thunder_possible";
  if ([1273, 1276].includes(code)) return "rain_with_thunder";
  if (
    [
      1066,
      1114,
      1117,
      1210,
      1213,
      1216,
      1219,
      1222,
      1225,
      1255,
      1258,
      1279,
      1282,
    ].includes(code)
  ) {
    return "snow";
  }
  if ([1069, 1204, 1207, 1249, 1252].includes(code)) return "sleet";
  if ([1237, 1261, 1264].includes(code)) return "ice_pellets";
  return "unknown";
}

function toneForIcon(iconKey: WeatherIconKey): WeatherStoryTone {
  if (["sunny_day", "clear_night"].includes(iconKey)) return "bright";
  if (
    ["partly_cloudy_day", "partly_cloudy_night", "cloudy"].includes(iconKey)
  ) {
    return "calm";
  }
  if (iconKey === "overcast") return "cozy";
  if (["mist", "fog", "haze", "smoke", "dust"].includes(iconKey)) return "foggy";
  if (["thunder_possible", "rain_with_thunder"].includes(iconKey)) return "caution";
  if (
    [
      "light_rain",
      "moderate_rain",
      "heavy_rain",
      "patchy_rain",
      "rain_shower",
      "torrential_rain",
      "drizzle",
      "freezing_drizzle",
      "freezing_rain",
    ].includes(iconKey)
  ) {
    return "rainy";
  }
  return "caution";
}

export const weatherApiToAtpIconMap: Record<number, WeatherApiConditionMapItem> =
  Object.fromEntries(
    (conditions as WeatherApiCondition[]).map((condition) => {
      const dayIcon = iconForCode(condition.code, true);
      const nightIcon = iconForCode(condition.code, false);
      return [
        condition.code,
        {
          code: condition.code,
          dayLabel: condition.day,
          nightLabel: condition.night,
          weatherApiIconId: condition.icon,
          afterTheParksDayIcon: dayIcon,
          afterTheParksNightIcon: nightIcon,
          storyTone: toneForIcon(dayIcon),
          altText: `${condition.day} weather`,
          ariaLabel: `${condition.day} during the day, ${condition.night} at night`,
        },
      ];
    })
  );

export function getWeatherIconKey(
  conditionCode: number,
  isDay: boolean
): WeatherIconKey {
  const item = weatherApiToAtpIconMap[conditionCode];
  if (!item) return "unknown";
  return isDay ? item.afterTheParksDayIcon : item.afterTheParksNightIcon;
}
