# Threads

**Threads is a lightweight SCSS utility library for defining and fetching style property values.**

Threads ships with a common set of property maps – all empty by default. Consumers are provided with a universal mixin for adding to any existing map, as well as a function corresponding to each property map for fetching a requested value.

## Philosophy

Threads makes few assumptions about how a consumer prefers to write styles. The core Threads library will not output any CSS.

Maps can be either 1 or 2 levels deep, meaning you can have something as simple as:

```scss
$shallow-map: (
  base: 'some-value',
  test: true,
  pie: 3.14159,
);
```

Or more robust, like so:

```scss
$deep-map: (
  base: (
    base: 10px,
    one: 'one',
    two: 2,
    three: 1px solid blue,
  ),
  test: base,
  maps: (
    base: 'more',
    other: 'maps',
    more: 'please',
  ),
);
```

Threads does not support _recursive deep-diving_ – maps more than 2 levels deep. This is by design. Our opinion is:

> If you require 3 or more levels of map values, you should probably break this out into a separate component map. Or, you can create a deep map and manage the fetch logic yourself.

## Concerns

Threads is only concerned with the management of property values. However, Threads comes with some very useful SCSS functions that will allow consumers to build their own maps and fetch functions. If you fancy modeling your maps after components, Threads gives you most of, if not all, the tools for the job.

## Property Patterns

Each individual property has its own dedicated map, which is then held within a _global master map_ called `$threads-properties`. Every property follows the same creation pattern.

**Let's look at `properties/color.scss`:**

```scss
$color-label: 'color';

$threads-properties: map-merge(
  $threads-properties, (
    $color-label: ()
  )
);
```

Here we have established the property label for `color` and created an empty _color map_, which is then merged into the global `$threads-properties` map.

**Next we have the `get-color` function:**

```scss
@function get-color($group: $threads-default-value, $variant: $threads-default-value) {
  $color-data: map-get($threads-properties, $color-label);
  $fetched-color: threads-value-get($color-data, $group, $variant);

  @if type-of($fetched-color) == color {
    @return $fetched-color;
  } @else {
    @error 'Color `#{$group} - #{$variant}` not found. Available options: #{available-names($color-data)}';
  }
}
```

Each fetch function accepts a `group` and a `variant` string – defaulting to `$threads-default-value`, making the arguments optional.

## Usage

**Define a custom `color` map:**

```scss
$custom-color-data: (
  base: transparent,
  white: #fff,
  black: #000,
  red: (
    light: #ff9797,
    base: #ff5d5d,
    dark: #d83e3e,
  ),
  green: (
    light: #b2d86a,
    base: #96bf48,
    dark: #7ba232,
  ),
  blue: (
    light: #57b8ff,
    base: #0042ff,
    dark: #0341dd,
  ),
);
```

Out of the box we have 0 color values in our map. Following the 1 or 2 level pattern, we can create a custom map with the values relevant to our designs.

**Merge custom map into global `color` property:**

```scss
@include threads-update-property('color', $custom-color-data);
```

We use the `threads-update-property()` mixin to merge our custom map into the global property map. `threads-update-property()` takes 2 arguments, the _property label_ string, and the _custom map_. If you mispell the _property label_ (or if it does not exist), your console will print out a list of all properties currently available in the `$threads-properties` global map.

**Finally, to fetch a value:**

```scss
.test {
  background-color: get-color(red, light);
}
```

This will give `.test` a `background-color` of `#ff9797`, as defined in our `$custom-color-data` map. If we omitted the `$variant` argument, we would get the `base` value of `#ff5d5d`. Omitting the `$group` argument would give us the `base` value of `transparent`.

## Overview

Here is what a typical SCSS manifest might look like for a project consuming Threads:

```scss
///
/// Reset
@import 'reset';

///
/// Vendor
@import 'threads/threads';

///
/// Theme properties
@import 'themes/custom-theme'; // your project theme, defining all custom property maps
@import 'themes/merge-with-threads'; // file to merge each custom map with the Threads global properties

// the rest of your project styles...
```

**Core**

The `threads.scss` file we `import` will load several partials.

First to load is `threads/core`, which includes our Threads `utilities` and `config`.

`utilities` is a collection of functions used internally by the Threads system. We recommend reading through `threads/core/utilities.scss`, as these functions will be very helpful when authoring your own custom maps and fetch functions.

`config` contains 2 important globals:

```scss
$threads-properties: (); // map to hold all Threads properties
$threads-default-value: 'base'; // global property default key
```

If you prefer a different default key from `base`, feel free to redefine `$threads-default-value` to another string. This must be done before you define any of your custom property maps.

**Properties**

Every single property Threads ships with. Each file follows the exact same pattern – the only difference being:

- property `label`
- name of the fetch function
- final `type-of()` error check.

Threads protects against inappropriate property values by checking the final result with `type-of()`. Sometimes, values are a bit ambiguous. Example:

> SCSS's inference of what values are `lists` vs `strings` is tough to predict. Therefore, `$font-stack` must type check against `list or string`.

Threads will throw an error if you are not using an inappropriate value for a particular property.
