# Threads

**Threads is a lightweight SCSS utility library for defining and retrieving style property values.**

Threads ships with a common set of property maps – all empty by default. Consumers are provided with a universal mixin for adding to any existing map, as well as a function corresponding to each property map for retrieving a requested value.

## Philosophy

Threads makes few assumptions about how a consumer prefers to write styles. The core Threads library does not output any CSS until the consumer has added to a map and retrieved its value at least once.

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

> If you require a 3rd level of map values, you should probably break this out into a separate component map, and manage the fetching logic yourself.

## Concerns

Threads is only concerned with the management of property values. However, Threads comes with some very useful SCSS functions that will allow consumers to build maps and retrieval functions however they like. If you fancy modeling your maps after components, Threads gives you all the tools for the job.

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

**Next we have the `color` retrieval function:**

```scss
@function color($group: $threads-default-value, $variant: $threads-default-value) {
  $color-data: map-get($threads-properties, $color-label);
  $fetched-color: threads-value-get($color-data, $group, $variant);

  @if type-of($fetched-color) == color {
    @return $fetched-color;
  } @else {
    @error 'Color `#{$group} - #{$variant}` not found. Available options: #{available-names($color-data)}';
  }
}
```

Each retrieval function accepts a `group` and a `variant` string – defaulting to `$threads-default-value`, making the arguments optional.

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

**Finally, to retrieve a value:**

```scss
.test {
  background-color: color(red, light);
}
```

This will give `.test` a `background-color` of `#ff9797`, as defined in our `$custom-color-data` map. If we omitted the `$variant` argument, we would get the `base` value of `#ff5d5d`. Omitting the `$group` argument would give us the `base` value of `transparent`.

## Tools

DISCUSS SOME IMPORTANT THINGS HERE... MAYBE MOVE THIS?

```scss
$threads-properties: ();
$threads-default-value: 'base';
```
