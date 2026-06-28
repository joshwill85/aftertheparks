import type { WeatherDayStory } from "@/lib/weather/dayStory";

export function WeatherStoryStrip({ story }: { story: WeatherDayStory }) {
  return (
    <section className="weather-story-strip">
      <h2>{story.headline}</h2>
      <p>{story.body}</p>
      <div className="weather-story-strip__chapters">
        {story.chapters.map((chapter) => (
          <a key={chapter.id} href={chapter.href}>
            <strong>{chapter.label}</strong>
            <span>{chapter.headline}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
