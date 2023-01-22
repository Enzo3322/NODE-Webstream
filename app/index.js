const API_URL = "http://localhost:3000";
let counter = 0;

async function consumeAPI(signal) {
  const response = await fetch(API_URL, {
    signal,
  });
  const reader = response.body
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(parseNDJSON());
  // .pipeTo(new WritableStream({
  //   write(chunk) {
  //     console.log(++counter, 'chunk', chunk)
  //   }
  // }))

  return reader;
}

function appendToHTML(element) {
  return new WritableStream({
    write({ title, description, director, duration, release_year, cast }) {
      window.scrollTo({
        left: 0,
        top: document.body.scrollHeight,
      });
      const card = `
      <article>
        <div class="text">
          <h3>[${++counter}] ${title}</h3>
          ${description && `<p>Description: ${description.slice(0, 60)}...</p>`}
          ${director && `<p>Director: ${director}</p>`}
          ${duration && `<p>Duration: ${duration}</p>`}
          ${release_year && `<p>Release Year: ${release_year}</p>`}
          ${cast && `<p>Cast: ${cast.slice(0, 50)}...</p>`}
        </div>
      </article>
      `;
      element.innerHTML += card;
    },
    abort(reason) {
      console.log("aborted**", reason);
    },
  });
}
function parseNDJSON() {
  let ndjsonBuffer = "";
  return new TransformStream({
    transform(chunk, controller) {
      ndjsonBuffer += chunk;
      const items = ndjsonBuffer.split("\n");
      items
        .slice(0, -1)
        .forEach((item) => controller.enqueue(JSON.parse(item)));

      ndjsonBuffer = items[items.length - 1];
    },
    flush(controller) {
      if (!ndjsonBuffer) return;
      controller.enqueue(JSON.parse(ndjsonBuffer));
    },
  });
}
const [start, stop, cards] = ["start", "stop", "cards"].map((item) =>
  document.getElementById(item)
);

let abortController = new AbortController();
start.addEventListener("click", async () => {
  try {
    const readable = await consumeAPI(abortController.signal);

    await readable.pipeTo(appendToHTML(cards), {
      signal: abortController.signal,
    });
  } catch (error) {
    if (!error.message.includes("abort")) throw error;
  }
});

stop.addEventListener("click", () => {
  abortController.abort();
  console.log("aborting...");
  abortController = new AbortController();
});
