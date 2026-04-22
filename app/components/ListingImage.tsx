"use client";

import Image, { type ImageLoaderProps, type ImageProps } from "next/image";
import {
  getSupabaseListingRenderUrl,
  isSupabaseListingImageUrl,
  withListingImageVersion,
} from "@/lib/listing-image-url";

const listingImageLoader = ({ src, width, quality }: ImageLoaderProps) =>
  getSupabaseListingRenderUrl(src, { width, quality });

export default function ListingImage(props: ImageProps) {
  const { alt, src, ...rest } = props;
  const resolvedSrc = typeof src === "string" ? withListingImageVersion(src) : src;
  const useSupabaseLoader =
    typeof resolvedSrc === "string" && isSupabaseListingImageUrl(resolvedSrc);

  return (
    <Image
      {...rest}
      alt={alt}
      src={resolvedSrc}
      loader={useSupabaseLoader ? listingImageLoader : undefined}
    />
  );
}
