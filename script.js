const SUPABASE_URL = "https://lbudxhjempyjozxpfnkg.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxidWR4aGplbXB5am96eHBmbmtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczOTM3MjEsImV4cCI6MjEwMjk2OTcyMX0.Nbw-EcVzG1vwmO5C-9xNOwuKRPqksXhL4eeH4exnbMo";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

const calendar = document.getElementById("calendar");
const yearElement = document.getElementById("year");

const today = new Date();

let currentYear = today.getFullYear();
let currentMonth = today.getMonth();

let mediaData = [];

const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
];

const weekdays = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday"
];

async function loadMediaData() {

    const { data, error } =
        await supabaseClient
            .from("media_calendar")
            .select("*")
            .order("media_date", {
                ascending: true
            })
            .order("media_type", {
                ascending: true
            })
            .order("sort_order", {
                ascending: true
            })
            .order("id", {
                ascending: true
            });


    if (error) {

        console.error(
            "Failed to load media:",
            error
        );

        alert(
            "Could not load data from Supabase."
        );

        return;
    }


    mediaData = data || [];

    renderCalendar();
}

async function copyMedia(
    id,
    newDate,
    newType
) {

    console.log("Copying media:", {
        id,
        newDate,
        newType
    });


    const media =
        mediaData.find(
            item =>
                String(item.id) === String(id)
        );


    if (!media) {

        console.error(
            "Original media not found:",
            id
        );

        return;
    }


    // Don't copy to the exact same cell

    if (
        media.media_date === newDate &&
        media.media_type === newType
    ) {

        console.log(
            "Same cell - nothing to copy."
        );

        return;
    }


    // =====================================================
    // INSERT NEW ROW
    // =====================================================

    const existingItems =
        mediaData.filter(
            item =>
                item.media_date === newDate &&
                item.media_type === newType
        );

    const newSortOrder =
        existingItems.length;

    const { data, error } =
        await supabaseClient
            .from("media_calendar")
            .insert({
                media_date: newDate,
                media_type: newType,
                image_url: media.image_url,
                sort_order: newSortOrder,
                episode: ""
            })
            .select()
            .single();


    if (error) {

        console.error(
            "SUPABASE COPY ERROR:",
            error
        );

        alert(
            "Could not copy image.\n\n" +
            error.message
        );

        return;
    }


    console.log(
        "Copy successful:",
        data
    );


    // =====================================================
    // ADD NEW ROW TO LOCAL DATA
    // =====================================================

    mediaData.push(data);


    // =====================================================
    // RE-RENDER
    // =====================================================

    renderCalendar();
}

async function reorderMedia(
    draggedId,
    targetId
) {

    const dragged =
        mediaData.find(
            item =>
                String(item.id) ===
                String(draggedId)
        );

    const target =
        mediaData.find(
            item =>
                String(item.id) ===
                String(targetId)
        );


    if (!dragged || !target) return;


    // Must be the same cell

    if (
        dragged.media_date !==
            target.media_date ||
        dragged.media_type !==
            target.media_type
    ) {
        return;
    }


    // =====================================================
    // GET ITEMS IN THIS CELL
    // =====================================================

    const items =
        mediaData
            .filter(
                item =>
                    item.media_date ===
                        dragged.media_date &&
                    item.media_type ===
                        dragged.media_type
            )
            .sort(
                (a, b) =>
                    (a.sort_order ?? 0) -
                    (b.sort_order ?? 0)
            );


    const oldIndex =
        items.findIndex(
            item =>
                String(item.id) ===
                String(draggedId)
        );

    const targetIndex =
        items.findIndex(
            item =>
                String(item.id) ===
                String(targetId)
        );


    if (
        oldIndex === -1 ||
        targetIndex === -1 ||
        oldIndex === targetIndex
    ) {
        return;
    }


    // =====================================================
    // MOVE ITEM
    // =====================================================

    const [movedItem] =
        items.splice(oldIndex, 1);


    items.splice(
        targetIndex,
        0,
        movedItem
    );


    // =====================================================
    // SAVE NEW ORDER
    // =====================================================

    for (
        let i = 0;
        i < items.length;
        i++
    ) {

        items[i].sort_order = i;


        const { error } =
            await supabaseClient
                .from("media_calendar")
                .update({
                    sort_order: i
                })
                .eq(
                    "id",
                    items[i].id
                );


        if (error) {

            console.error(
                "Failed to update order:",
                error
            );

            alert(
                "Could not reorder images."
            );

            return;
        }
    }


    // =====================================================
    // UPDATE LOCAL DATA
    // =====================================================

    mediaData = [
        ...mediaData.filter(
            item =>
                !(
                    item.media_date ===
                        dragged.media_date &&
                    item.media_type ===
                        dragged.media_type
                )
        ),
        ...items
    ];


    renderCalendar();
}

// =========================================================
// RENDER CALENDAR
// =========================================================

function renderCalendar() {

    calendar.innerHTML = "";

    yearElement.textContent = currentYear;

    createMonth(currentMonth);


    // =====================================================
    // SCROLL TO TODAY WITHOUT ANIMATION
    // =====================================================

    if (
        currentYear === today.getFullYear() &&
        currentMonth === today.getMonth()
    ) {

        const todayElement =
            document.querySelector(".today");


        if (todayElement) {

            const header =
                document.querySelector("header");

            const monthHeader =
                document.querySelector(".month-header");

            const weekdays =
                document.querySelector(".weekdays");


            let offset = 0;


            if (header) {
                offset += header.offsetHeight;
            }


            if (monthHeader) {
                offset += monthHeader.offsetHeight;
            }


            if (weekdays) {
                offset += weekdays.offsetHeight;
            }


            offset += 0;


            const elementTop =
                todayElement.getBoundingClientRect().top
                + window.scrollY;


            const scrollPosition =
                elementTop - offset;


            // Disable smooth scrolling temporarily

            document.documentElement.style.scrollBehavior =
                "auto";


            window.scrollTo({
                top: scrollPosition,
                behavior: "auto"
            });


            // Restore smooth scrolling for normal user scrolling

            requestAnimationFrame(() => {

                document.documentElement.style.scrollBehavior =
                    "smooth";

            });

        }
    }
}


// =========================================================
// CREATE MONTH
// =========================================================

function createMonth(month) {

    const monthElement = document.createElement("section");

    monthElement.className = "month";


    // =====================================================
    // MONTH HEADER
    // =====================================================

    const monthHeader = document.createElement("div");

    monthHeader.className = "month-header";


    const previousButton =
        document.createElement("button");

    previousButton.className = "month-nav";

    previousButton.textContent = "←";


    previousButton.addEventListener("click", () => {

        changeMonth(-1);

    });


    const title = document.createElement("h2");

    title.textContent =
        `${months[month]} ${currentYear}`;


    const nextButton =
        document.createElement("button");

    nextButton.className = "month-nav";

    nextButton.textContent = "→";


    nextButton.addEventListener("click", () => {

        changeMonth(1);

    });


    monthHeader.append(
        previousButton,
        title,
        nextButton
    );


    monthElement.appendChild(monthHeader);


    // =====================================================
    // WEEKDAYS
    // =====================================================

    const weekdaysContainer =
        document.createElement("div");

    weekdaysContainer.className = "weekdays";


    weekdays.forEach(day => {

        const weekday =
            document.createElement("div");

        weekday.className = "weekday";

        weekday.textContent = day;

        weekdaysContainer.appendChild(weekday);

    });


    monthElement.appendChild(weekdaysContainer);


    // =====================================================
    // DAYS
    // =====================================================

    const daysContainer =
        document.createElement("div");

    daysContainer.className = "days";


    const daysInMonth =
        new Date(
            currentYear,
            month + 1,
            0
        ).getDate();


    // JS Sunday = 0
    // Convert to Monday = 0

    let firstDay =
        new Date(
            currentYear,
            month,
            1
        ).getDay();

    firstDay = (firstDay + 6) % 7;


    // Empty cells before first day

    for (let i = 0; i < firstDay; i++) {

        const emptyDay =
            document.createElement("div");

        emptyDay.className = "day empty";

        daysContainer.appendChild(emptyDay);
    }


    // Actual days

    for (
        let day = 1;
        day <= daysInMonth;
        day++
    ) {

        createDay(
            daysContainer,
            currentYear,
            month,
            day
        );

    }


    monthElement.appendChild(daysContainer);

    calendar.appendChild(monthElement);
}


// =========================================================
// CREATE DAY
// =========================================================

function createDay(
    container,
    year,
    month,
    day
) {

    const dayElement =
        document.createElement("div");

    dayElement.className = "day";


    // Check today

    if (
        year === today.getFullYear() &&
        month === today.getMonth() &&
        day === today.getDate()
    ) {

        dayElement.classList.add("today");

    }


    // Date

    const date =
        document.createElement("div");

    date.className = "date";

    date.textContent = day;


    // Date string
    // YYYY-MM-DD

    const dateString =
        `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;


    // Media

    const mediaContainer =
        document.createElement("div");

    mediaContainer.className =
        "media-container";


    const game =
        createMediaCell(
            "🎮 Game",
            dateString,
            "game"
        );


    const movie =
        createMediaCell(
            "🎬 Movie / Series",
            dateString,
            "movie"
        );


    mediaContainer.append(
        game,
        movie
    );


    dayElement.append(
        date,
        mediaContainer
    );


    container.appendChild(dayElement);
}


// =========================================================
// MEDIA CELL
// =========================================================

function createMediaCell(
    title,
    dateString,
    mediaType
) {

    const cell =
        document.createElement("div");

    cell.className = "media-cell";


    // Header

    const header =
        document.createElement("div");

    header.className =
        "media-header";


    const titleElement =
        document.createElement("span");

    titleElement.textContent =
        title;


    const addButton =
        document.createElement("button");

    addButton.textContent = "+";

    addButton.className =
        "add-media";


    const images =
        document.createElement("div");

    images.className =
        "media-images";

    images.dataset.date = dateString;

    images.dataset.type = mediaType;

    images.addEventListener(
        "dragover",
        event => {

            event.preventDefault();

            event.dataTransfer.dropEffect =
                "copy";

            images.classList.add(
                "drag-over"
            );
        }
    );


    images.addEventListener(
        "dragleave",
        event => {

            if (
                !images.contains(
                    event.relatedTarget
                )
            ) {

                images.classList.remove(
                    "drag-over"
                );

            }
        }
    );


    images.addEventListener(
        "drop",
        async event => {

            event.preventDefault();

            event.stopPropagation();

            images.classList.remove(
                "drag-over"
            );


            const id =
                event.dataTransfer.getData(
                    "text/plain"
                );


            console.log(
                "DROP DETECTED:",
                id,
                dateString,
                mediaType
            );


            if (!id) {

                console.error(
                    "No media ID found in drag data."
                );

                return;
            }


            await copyMedia(
                id,
                dateString,
                mediaType
            );
        }
    );


    // Load existing images

    const existingImages =
        mediaData.filter(item =>

            item.media_date === dateString &&
            item.media_type === mediaType

        );


    existingImages.forEach(item => {

        createImageElement(
            images,
            item
        );

    });


    // Add image

    addButton.addEventListener(
        "click",
        () => {

            addImage(
                images,
                dateString,
                mediaType
            );

        }
    );


    header.append(
        titleElement,
        addButton
    );


    cell.append(
        header,
        images
    );


    return cell;
}

function createImageElement(container, item) {

    const wrapper = document.createElement("div");
    wrapper.className = "media-image-wrapper";
    wrapper.draggable = true;
    wrapper.dataset.id = item.id;


    // =====================================================
    // IMAGE
    // =====================================================

    const img = document.createElement("img");

    img.src = item.image_url;
    img.className = "media-image";
    img.loading = "lazy";

    // =====================================================
    // EPISODE INPUT
    // =====================================================

    const episodeInput =
        document.createElement("input");

    episodeInput.type = "text";

    episodeInput.className =
        "episode-input";

    episodeInput.placeholder =
        "Episode";

    episodeInput.value =
        item.episode || "";


    episodeInput.addEventListener(
        "click",
        event => {
            event.stopPropagation();
        }
    );


    episodeInput.addEventListener(
        "dragstart",
        event => {
            event.stopPropagation();
        }
    );


    // Save when changed

    episodeInput.addEventListener(
        "change",
        async event => {

            event.stopPropagation();

            const episode =
                episodeInput.value.trim();


            const { error } =
                await supabaseClient
                    .from("media_calendar")
                    .update({
                        episode: episode
                    })
                    .eq(
                        "id",
                        item.id
                    );


            if (error) {

                console.error(
                    "Failed to save episode:",
                    error
                );

                alert(
                    "Could not save episode."
                );

                return;
            }


            // Update local data

            const localItem =
                mediaData.find(
                    media =>
                        String(media.id) ===
                        String(item.id)
                );

            if (localItem) {
                localItem.episode =
                    episode;
            }

            item.episode =
                episode;
        }
    );

    img.onerror = () => {

        img.classList.add("image-error");

        const errorLabel =
            document.createElement("div");

        errorLabel.className =
            "image-error-label";

        errorLabel.textContent =
            "⚠ Image failed to load";

        errorLabel.title =
            item.image_url;

        wrapper.appendChild(errorLabel);
    };


    // =====================================================
    // DELETE BUTTON
    // =====================================================

    const deleteButton =
        document.createElement("button");

    deleteButton.className =
        "delete-media";

    deleteButton.textContent = "×";

    deleteButton.title =
        "Delete image";


    deleteButton.addEventListener(
        "click",
        async event => {

            event.stopPropagation();

            const confirmed =
                confirm("Delete this image?");

            if (!confirmed) return;


            const { error } =
                await supabaseClient
                    .from("media_calendar")
                    .delete()
                    .eq("id", item.id);


            if (error) {

                console.error(
                    "Failed to delete image:",
                    error
                );

                alert(
                    "Could not delete image."
                );

                return;
            }


            mediaData =
                mediaData.filter(
                    media =>
                        media.id !== item.id
                );


            wrapper.remove();
        }
    );


    // =====================================================
    // DRAG START
    // =====================================================

    wrapper.addEventListener(
        "dragstart",
        event => {

            event.stopPropagation();

            event.dataTransfer.effectAllowed =
                "copyMove";

            event.dataTransfer.setData(
                "text/plain",
                String(item.id)
            );

            wrapper.classList.add(
                "dragging"
            );
        }
    );


    // =====================================================
    // DRAG END
    // =====================================================

    wrapper.addEventListener(
        "dragend",
        () => {

            wrapper.classList.remove(
                "dragging"
            );

            document
                .querySelectorAll(
                    ".drag-target"
                )
                .forEach(element => {

                    element.classList.remove(
                        "drag-target"
                    );

                });
        }
    );


    // =====================================================
    // DRAG OVER ANOTHER IMAGE
    // =====================================================

    wrapper.addEventListener(
        "dragover",
        event => {

            event.preventDefault();

            event.stopPropagation();

            const draggedId =
                event.dataTransfer.getData(
                    "text/plain"
                );


            // Don't target itself

            if (
                String(draggedId) ===
                String(item.id)
            ) {
                return;
            }


            const dragged =
                mediaData.find(
                    media =>
                        String(media.id) ===
                        String(draggedId)
                );


            if (!dragged) return;


            // Only reorder inside same cell

            if (
                dragged.media_date ===
                    item.media_date &&
                dragged.media_type ===
                    item.media_type
            ) {

                wrapper.classList.add(
                    "drag-target"
                );

                event.dataTransfer.dropEffect =
                    "move";
            }
        }
    );


    // =====================================================
    // DROP ON ANOTHER IMAGE
    // =====================================================

    wrapper.addEventListener(
        "drop",
        async event => {

            event.preventDefault();

            event.stopPropagation();


            wrapper.classList.remove(
                "drag-target"
            );


            const draggedId =
                event.dataTransfer.getData(
                    "text/plain"
                );


            if (!draggedId) return;


            // Same image

            if (
                String(draggedId) ===
                String(item.id)
            ) {
                return;
            }


            const dragged =
                mediaData.find(
                    media =>
                        String(media.id) ===
                        String(draggedId)
                );


            if (!dragged) return;


            // =================================================
            // SAME CELL = REORDER
            // =================================================

            if (
                dragged.media_date ===
                    item.media_date &&
                dragged.media_type ===
                    item.media_type
            ) {

                await reorderMedia(
                    dragged.id,
                    item.id
                );

                return;
            }


            // =================================================
            // DIFFERENT CELL = COPY
            // =================================================

            await copyMedia(
                dragged.id,
                item.media_date,
                item.media_type
            );
        }
    );


    wrapper.append(
        img,
        episodeInput,
        deleteButton
    );


    container.appendChild(
        wrapper
    );
}


// =========================================================
// ADD IMAGE
// =========================================================

async function addImage(
    container,
    dateString,
    mediaType
) {
    const url = prompt("Paste image URL:");

    if (!url) return;

    // Check URL
    try {
        new URL(url);
    } catch {
        alert("Invalid image URL.");
        return;
    }

    // Insert image only
    const { data, error } =
        await supabaseClient
            .from("media_calendar")
            .insert({
                media_date: dateString,
                media_type: mediaType,
                image_url: url,
                episode: ""
            })
            .select()
            .single();

    if (error) {
        console.error(
            "Failed to save image:",
            error
        );

        alert(
            "Could not save image to Supabase."
        );

        return;
    }

    // Add to local data
    mediaData.push(data);

    // Create image
    createImageElement(
        container,
        data
    );
}


// =========================================================
// CHANGE MONTH
// =========================================================

function changeMonth(direction) {

    currentMonth += direction;


    // Previous year

    if (currentMonth < 0) {

        currentMonth = 11;

        currentYear--;

    }


    // Next year

    if (currentMonth > 11) {

        currentMonth = 0;

        currentYear++;

    }


    renderCalendar();
}


// =========================================================
// YEAR CONTROLS
// =========================================================

document
    .getElementById("prevYear")
    .addEventListener("click", () => {

        currentYear--;

        // January when moving to another year
        currentMonth = 0;

        renderCalendar();

    });


document
    .getElementById("nextYear")
    .addEventListener("click", () => {

        currentYear++;

        // January when moving to another year
        currentMonth = 0;

        renderCalendar();

    });


// =========================================================
// INITIAL RENDER
// =========================================================

loadMediaData();