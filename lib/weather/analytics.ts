export type WeatherAnalyticsEvent =
  | "weather_module_impression"
  | "weather_window_impression"
  | "weather_story_chapter_click"
  | "weather_backup_cta_click"
  | "weather_plan_change_prompt"
  | "weather_plan_item_warning_view"
  | "weather_plan_resilience_view"
  | "nws_alert_banner_view"
  | "nws_alert_detail_open"
  | "nws_forecast_used"
  | "visual_crossing_outlook_used"
  | "weather_provider_route_selected"
  | "weather_provider_error"
  | "weather_stale_served"
  | "weather_api_quota_near_limit"
  | "visual_crossing_quota_near_limit"
  | "weather_forecast_not_available_yet"
  | "weather_near_term_rain_view"
  | "weather_precip_map_view"
  | "weather_warm_cache_result"
  | "weather_health_degraded";

export interface WeatherAnalyticsPayload {
  provider?: string;
  locationKey?: string;
  confidence?: string;
  status?: number | string;
  hoursOut?: number;
  source?: string;
  [key: string]: string | number | boolean | undefined;
}

export function trackWeatherEvent(
  event: WeatherAnalyticsEvent,
  payload: WeatherAnalyticsPayload = {}
) {
  void event;
  void payload;
}
