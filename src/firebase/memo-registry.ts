'use client';

/**
 * A registry to track memoized Firebase objects (like DocumentReference, Query)
 * without modifying the objects themselves, which are often frozen/immutable.
 */
export const memoRegistry = new WeakSet<object>();
