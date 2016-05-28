# jquery-enhanced-select
Improved dropdown input that supports filtering, a 'Select All' option, and uses checkboxes. Heavily influenced by, and originally forked from, multiple-select v1.1.0 by 'Zhixin Wen' (https://github.com/wenzhixin/multiple-select/tree/1.1.0)

Uses much of the original code as a base, with some fundamental changes:
* Implemented as jQuery UI widget rather than raw jQuery plugin
* Widget behaves as a proxy to original input, it doesn't create a separate form submission value
* Some functionality that either no longer applied, or I didn't see as useful, has been removed
