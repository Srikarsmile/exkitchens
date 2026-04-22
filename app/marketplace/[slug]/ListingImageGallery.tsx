"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { getShimmerBlurDataUrl } from "@/lib/image-placeholder";

interface ListingImageGalleryProps {
  title: string;
  heroImage: string;
  galleryImages: string[];
}

export default function ListingImageGallery({
  title,
  heroImage,
  galleryImages,
}: ListingImageGalleryProps) {
  const images = useMemo(
    () => [heroImage, ...galleryImages.filter((imageUrl) => imageUrl !== heroImage)],
    [galleryImages, heroImage],
  );
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const activeImageIndex = activeIndex ?? 0;
  const inlineGalleryImages = galleryImages.slice(0, 4);
  const remainingInlineImageCount = Math.max(
    galleryImages.length - inlineGalleryImages.length,
    0,
  );
  const heroBlurDataUrl = getShimmerBlurDataUrl(1600, 960);
  const galleryBlurDataUrl = getShimmerBlurDataUrl(640, 480);

  useEffect(() => {
    if (activeIndex === null) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveIndex(null);
        return;
      }

      if (images.length < 2) {
        return;
      }

      if (event.key === "ArrowRight") {
        setActiveIndex((currentIndex) =>
          currentIndex === null ? 0 : (currentIndex + 1) % images.length,
        );
      }

      if (event.key === "ArrowLeft") {
        setActiveIndex((currentIndex) =>
          currentIndex === null
            ? images.length - 1
            : (currentIndex - 1 + images.length) % images.length,
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeIndex, images]);

  const activeImage = activeIndex === null ? null : images[activeImageIndex];

  return (
    <>
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setActiveIndex(0)}
          className="group relative block min-h-[320px] w-full overflow-hidden rounded-[2rem] bg-[#f3f3f3] text-left md:min-h-[420px] lg:h-[560px]"
          aria-label={`View larger image of ${title}`}
        >
          <Image
            src={heroImage}
            alt={title}
            fill
            priority
            sizes="100vw"
            quality={70}
            placeholder="blur"
            blurDataURL={heroBlurDataUrl}
            className="object-cover transition duration-300 group-hover:scale-[1.02]"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/50 via-black/10 to-transparent p-4 text-white">
            <span className="rounded-full bg-black/45 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em]">
              Click to enlarge
            </span>
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/15 backdrop-blur">
              <Expand className="h-5 w-5" aria-hidden="true" />
            </span>
          </div>
        </button>

        {galleryImages.length > 0 ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {inlineGalleryImages.map((imageUrl, index) => (
                <button
                  key={imageUrl}
                  type="button"
                  onClick={() => setActiveIndex(index + 1)}
                  className="group relative h-44 overflow-hidden rounded-2xl bg-[#f3f3f3] text-left"
                  aria-label={`View gallery image ${index + 1} for ${title}`}
                >
                  <Image
                    src={imageUrl}
                    alt={`${title} gallery image ${index + 1}`}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
                    quality={55}
                    placeholder="blur"
                    blurDataURL={galleryBlurDataUrl}
                    className="object-cover transition duration-300 group-hover:scale-[1.03]"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />
                </button>
              ))}
            </div>

            {remainingInlineImageCount > 0 ? (
              <button
                type="button"
                onClick={() => setActiveIndex(0)}
                className="inline-flex items-center justify-center rounded-full border border-gray-200 px-5 py-3 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:text-gray-900"
              >
                View all {images.length} photos
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {activeImage ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${title} image viewer`}
          className="fixed inset-0 z-50 bg-black/92 px-4 py-6"
          onClick={() => setActiveIndex(null)}
        >
          <div className="mx-auto flex h-full w-full max-w-7xl flex-col">
            <div className="flex items-center justify-between gap-4 pb-4 text-white">
              <div>
                <p className="text-sm uppercase tracking-[0.18em] text-white/60">
                  Kitchen gallery
                </p>
                <p className="mt-1 text-sm text-white/85">
                  Image {activeImageIndex + 1} of {images.length}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveIndex(null)}
                className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/8 text-white transition hover:bg-white/14"
                aria-label="Close image viewer"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="relative flex-1" onClick={(event) => event.stopPropagation()}>
              <div className="relative h-full min-h-[50vh] overflow-hidden rounded-[2rem] bg-black/30">
                <Image
                  src={activeImage}
                  alt={`${title} enlarged image ${activeImageIndex + 1}`}
                  fill
                  sizes="100vw"
                  quality={75}
                  placeholder="blur"
                  blurDataURL={heroBlurDataUrl}
                  className="object-contain"
                  priority
                />
              </div>

              {images.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveIndex((currentIndex) =>
                        currentIndex === null
                          ? images.length - 1
                          : (currentIndex - 1 + images.length) % images.length,
                      )
                    }
                    className="absolute left-3 top-1/2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white transition hover:bg-black/60"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setActiveIndex((currentIndex) =>
                        currentIndex === null ? 0 : (currentIndex + 1) % images.length,
                      )
                    }
                    className="absolute right-3 top-1/2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white transition hover:bg-black/60"
                    aria-label="Next image"
                  >
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                  </button>
                </>
              ) : null}
            </div>

            {images.length > 1 ? (
              <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                {images.map((imageUrl, index) => (
                  <button
                    key={imageUrl}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    className={`relative h-20 w-24 shrink-0 overflow-hidden rounded-2xl border transition ${
                      index === activeIndex
                        ? "border-white/90 ring-2 ring-white/60"
                        : "border-white/10 opacity-70 hover:opacity-100"
                    }`}
                    aria-label={`Open image ${index + 1}`}
                  >
                    <Image
                      src={imageUrl}
                      alt={`${title} thumbnail ${index + 1}`}
                      fill
                      sizes="96px"
                      quality={45}
                      placeholder="blur"
                      blurDataURL={galleryBlurDataUrl}
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
