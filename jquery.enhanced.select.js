/**
 * @author Michael Ziminsky <mgziminsky@gmail.com>
 * @version 0.1.0
 * @license MIT
 * @source https://github.com/mgziminsky/jquery-enhanced-select
 *
 * Based on multiple-select plugin by Zhixin Wen v1.1.0
 * http://wenzhixin.net.cn/p/multiple-select/
 *
 * Uses much of the original code as a base, with some fundamental changes:
 *   - Implemented as jQuery UI widget rather than raw jQuery plugin
 *   - Widget behaves as a proxy to original input, it doesn't create a separate form submission value
 *   - Some functionality that either no longer applied, or I didn't see as useful, has been removed
 */

(function($) {

    'use strict';

    $.widget('mz.enhancedSelect', {
        version: '0.1.0',
        options: {
            keepOpen: false,
            placeholder: null,
            selectAll: true,
            selectAllText: '[Select All]',
            selectAllValue: undefined,
            allSelectedText: 'All selected',
            delimiter: ', ',
            displayValues: false,
            minimumCountSelected: 3,
            countSelectedText: '# of % selected',
            noMatchesText: 'No matches found',
            multiple: undefined,
            stacked: false,
            stackedWidth: 80,
            filter: true,
            width: undefined,
            maxHeight: 250,
            container: undefined,
            position: 'bottom',
            searchDelay: 350,

            styler: function(value) {
                return false;
            }
        },

        _init: function() {
            if (this.options.multiple === undefined) {
                this.options.multiple = this.element.prop('multiple');
            } else {
                this.element.prop('multiple', this.options.multiple);
            }
            if (this.element.prop('disabled')) {
                this.disable();
            } else {
                this.enable();
            }

            if (this.isCreated) {
                this.refresh();
            }
        },

        _create: function() {
            this.element.hide();

            this.$parent = $('<div class="ms-parent"></div>');
            this.$placeholder = $('<span class="placeholder"></span>');
            this.$choice = $('<button type="button" class="ms-choice"><div></div></button>').prepend(this.$placeholder).appendTo(this.$parent);
            this.$drop = $('<div></div>').appendTo(this.$parent);
            this.$opts = $('<ul></ul>');

            this.$filter = $('<div class="ms-search"></div>');
            this.$searchInput = $('<input type="text" autocomplete="off" autocorrect="off" autocapitilize="off" spellcheck="false">').appendTo(this.$filter);
            this.$selectAll = $('<input type="checkbox" />');

            this.$parent.insertAfter(this.element);

            this._createEvents();
            this.refresh();

            this.isCreated = true;
        },

        _destroy: function() {
            this.$parent.remove();
            this.isCreated = false;
            this.element.show();
        },

        _createEvents: function() {
            var self = this;

            function toggleOpen(e) {
                e.preventDefault();
                self[self.isOpen ? 'close' : 'open']();
            }

            var label = this.element.closest('label')[0] || $('label[for=' + this.element.attr('id') + ']')[0];
            if (label) {
                this._on(label, {
                    click: function(e) {
                        toggleOpen(e);
                        if (!(this.options.filter || this.isOpen)) {
                            this.focus();
                        }
                        e.stopPropagation(); // Causes lost focus otherwise
                    }
                });
            }

            this._on(this.$choice, {
                click: toggleOpen
            });

            this._on(this.$parent, {
                keydown: function(e) {
                    switch (e.which) {
                        case 27: // esc key
                            self.close();
                            self.$choice.focus();
                            break;
                        case 13: // enter
                            if (this.options.multiple) {
                                e.preventDefault();
                                this.$selectAll.click();
                            }
                            break;
                    }
                }
            });

            var searchTimer;
            this._on(this.$searchInput, {
                keydown: function(e) {
                    if (e.keyCode === 9 && e.shiftKey) { // Ensure shift-tab causes lost focus from filter as with clicking away
                        this.close();
                    }
                },
                keyup: function(e) {
                    if (searchTimer) clearTimeout(searchTimer);
                    searchTimer = setTimeout(function() { this.filter(this.$searchInput.val().trim()); }, this.options.searchDelay);
                }
            });
        },

        _optionToListItem: function(elm, group, groupDisabled) {
            var $elm = $(elm),
                disabled,
                type = this.options.multiple ? 'checkbox' : 'radio';

            var item = $('<li></li>'),
                label = $('<label></label>').appendTo(item),
                input = $('<input />').attr('type', type).appendTo(label);

            if ($elm.is('option')) {
                var value = $elm.val();
                disabled = groupDisabled || $elm.prop('disabled');

                item.css(this.options.styler(value) || {});
                label.append($elm.text());
                input.addClass('es-item')
                    .attr('value', value).attr('data-group', group)
                    .prop('checked', $elm.prop('selected')).prop('disabled', disabled);

                if (this.options.stacked) {
                    item.addClass('stacked');
                }
            } else if (!group && $elm.is('optgroup')) {
                var _group = $elm.attr('label');
                disabled = $elm.prop('disabled');

                item.addClass('group');
                label.addClass('optgroup').attr('data-group', _group).append(_group);
                if (this.options.multiple) {
                    input.addClass('es-group').prop('disabled', disabled);
                } else {
                    input.remove(); // No group selector for single selects
                }

                var self = this;
                $elm.children().each(function(i, elm) {
                    item = item.add(self._optionToListItem(elm, _group, disabled));
                });
            }

            if (disabled) {
                label.addClass('disabled');
            }

            return item;
        },

        _getSelects: function() {
            var self = this,
                texts = [],
                values = [];

            var items = this.$allItems;

            items.filter(':checked').each(function() {
                texts.push($(this).parent().text());
                values.push(this.value);
            });

            if (this.options.multiple && this.$selectGroups.length) {
                texts = [];
                this.$selectGroups.each(function() {
                    var html = [],
                        text = $(this).text().trim(),
                        group = $(this).data('group'),
                        $children = items.filter('[data-group=' + group + ']'),
                        $selected = $children.filter(':checked');

                    if ($selected.length === 0) {
                        return;
                    }

                    html.push('[');
                    html.push(text);
                    if ($children.length > $selected.length) {
                        var list = [];
                        $selected.each(function() {
                            list.push($(this).parent().text());
                        });
                        html.push(': ' + list.join(self.options.delimiter));
                    }
                    html.push(']');
                    texts.push(html.join(''));
                });
            }

            return {
                texts: texts,
                values: values,
                count: values.length
            };
        },

        _updateHelperChecks: function() {
            var items = this.$enabledItems;
            if (this.isOpen) {
                items = items.filter(':visible');
            }
            var checked = items.filter(':checked');

            this.$selectAll.prop('checked', items.length === checked.length);
            if (this.$selectGroups.length) {
                this.$selectGroups.filter(':visible').each(function() {
                    var grp = '[data-group=' + $(this).text() + ']';
                    $('.es-group', this).prop('checked', items.filter(grp).length === checked.filter(grp).length);
                });
            }
        },

        _update: function(skipTrigger) {
            this.$placeholder.removeClass('placeholder');
            this._updateHelperChecks();
            var selects = this._getSelects(),
                allSelected = (selects.count === this.$allItems.length),
                display = (this.options.displayValues ? selects.values : selects.texts);

            if (selects.count === 0) {
                this.$placeholder.addClass('placeholder').text(this.options.placeholder);
            } else if (this.options.allSelectedText && allSelected) {
                this.$placeholder.text(this.options.allSelectedText);
            } else if (this.options.countSelectedText && selects.count < this.options.minimumCountSelected) {
                this.$placeholder.text(display.join(this.options.delimiter));
            } else if ((this.options.countSelectedText || this.options.etcaetera) && selects.count > this.options.minimumCountSelected) {
                if (this.options.etcaetera) {
                    this.$placeholder.text(display.slice(0, this.options.minimumCountSelected).join(this.options.delimiter) + '...');
                } else {
                    this.$placeholder.text(this.options.countSelectedText
                        .replace('#', selects.count)
                        .replace('%', this.$allItems.length));
                }
            } else {
                this.$placeholder.text(display.join(this.options.delimiter));
            }

            // add selected class to selected li
            this.$opts.find('li').removeClass('selected');
            this.$opts.find(':input:checked').closest('li').addClass('selected');

            this.element.val((allSelected && this.options.selectAllValue) ? null : selects.values);
            if (!skipTrigger) {
                this._trigger('change');
            }
        },

        _updateChecks: function(check, ignoreFilter, group) {
            var items = this.$enabledItems;
            if (!ignoreFilter) {
                items = items.filter(':visible');
            }
            if (group) {
                items = items.filter('[data-group=' + group + ']');
            }
            items.prop('checked', check);
            this._update();
        },

        // Public Methods

        refresh: function() {
            var self = this;

            this.$drop.attr('class', 'ms-drop').addClass(this.options.position);
            this.$parent.css('width', this.options.width);
            this.$parent.css('min-width', this.element.outerWidth());

            this.$drop.children().detach();

            if (this.isCreated) {
                this._off(this.$selectGroups, 'change');
                this._off(this.$enabledItems, 'change');
                this._off(this.$selectAll, 'change');
                this._off($(document), 'click');
            }

            if (this.options.filter) {
                this.$filter.prependTo(this.$drop);
            }

            this.$opts.empty();
            this.element.children().each(function(i, e) {
                self._optionToListItem(e).appendTo(self.$opts);
            });
            this.$noResults = $('<li class="ms-no-results"></li>').text(this.options.noMatchesText);
            this.$opts.append(this.$noResults);
            this.$opts.css('max-height', this.options.maxHeight + 'px');

            if (this.options.selectAll && this.options.multiple) {
                if (this.options.selectAllValue !== undefined) {
                    this.$selectAll.attr('value', this.options.selectAllValue).attr('name', this.element.attr('name'));
                } else {
                    this.$selectAll.removeAttr('value').removeAttr('name');
                }

                var label = $('<label>').text(this.options.selectAllText).prepend(this.$selectAll);
                this.$opts.prepend($('<li class="ms-select-all"></li>').append(label));

                // Why doesn't this work when defined in _createEvents???
                this._on(this.$selectAll, {
                    change: function(e) {
                        var checked = $(e.target).is(':checked');
                        if (checked) {
                            this.selectAll();
                        } else {
                            this.unselectAll();
                        }
                    }
                });
            }

            this.$opts.find('.multiple').css('width', this.options.stackedWidth);

            this.$selectGroups = this.$opts.find('label.optgroup');
            this.$allItems = this.$opts.find(':input.es-item');
            this.$enabledItems = this.$allItems.filter(':enabled');
            this.$disabledItems = this.$allItems.filter(':disabled');

            this.$opts.appendTo(this.$drop);

            this._on(this.$selectGroups, {
                change: function(e) {
                    var target = $(e.target),
                        group = target.parent().data('group');
                    if (target.is(':checked')) {
                        this.selectGroup(group);
                    } else {
                        this.unselectGroup(group);
                    }
                }
            });

            this._on(this.$enabledItems, {
                change: function(e) {
                    if (!this.options.multiple && $(e.target).is(':checked')) {
                        this.$enabledItems.not(e.target).prop('checked', false);
                    }
                    if (this.isOpen && !(this.options.keepOpen || this.options.multiple)) {
                        this.close();
                    }
                    this._update();
                }
            });

            if (!this.options.keepOpen) {
                this._on($(document), {
                    click: function(e) {
                        if (this.isOpen && $(e.target).closest('div.ms-parent')[0] !== this.$parent[0]) {
                            this.close();
                        }
                    }
                });
            }
            this._update(true);
        },

        open: function() {
            this.$choice.find('>div').addClass('open');
            this.$drop.show();

            if (this.element.children().length === 0) {
                this.$selectAll.closest('li.ms-select-all').hide();
                this.$noResults.show();
            } else {
                this.$selectAll.closest('li.ms-select-all').show();
                this.$noResults.hide();
            }

            if (this.options.container) {
                var offset = this.$drop.offset();
                this.$drop.appendTo($(this.options.container));
                this.$drop.offset({
                    top: offset.top,
                    left: offset.left
                });
            }
            if (this.options.filter) {
                this.$searchInput.val('');
                this.$searchInput.focus();
                this.filter();
            }
            this._trigger('open');
            this.isOpen = true;
        },

        close: function() {
            this.$choice.find('>div').removeClass('open');
            this.$drop.hide();
            if (this.options.container) {
                this.$parent.append(this.$drop);
                this.$drop.css({
                    'top': 'auto',
                    'left': 'auto'
                });
            }
            this._trigger('close');
            this.isOpen = false;
        },

        filter: function(searchVal) {
            var self = this;

            if (!searchVal) {
                this.$allItems.parent().show();
                this.$selectGroups.show();
            } else {
                this.$disabledItems.parent().hide();
                this.$enabledItems.each(function() {
                    var $parent = $(this).parent();
                    $parent[$parent.text().toLowerCase().indexOf(searchVal.toLowerCase()) < 0 ? 'hide' : 'show']();
                });

                this.$selectGroups.each(function() {
                    var group = $(this).data('group'),
                        $items = self.$enabledItems.filter(':visible');
                    $(this)[$items.filter('[data-group=' + group + ']').length ? 'show' : 'hide']();
                });

            }
            //Check if no matches found
            if (this.$enabledItems.filter(':visible').length) {
                this.$selectAll.parent().show();
                this.$noResults.hide();
            } else {
                this.$selectAll.parent().hide();
                this.$noResults.show();
            }
            this._updateHelperChecks();
        },

        selectAll: function(ignoreFilter) {
            this._trigger('selectAll');
            this._updateChecks(true, ignoreFilter);
        },

        unselectAll: function(ignoreFilter) {
            this._trigger('unselectAll');
            this._updateChecks(false, ignoreFilter);
        },

        selectGroup: function(group, ignoreFilter) {
            if (!this.options.multiple) {
                return;
            } // NOOP for single mode
            this._trigger('selectGroup', null, group);
            this._updateChecks(true, ignoreFilter, group);
        },

        unselectGroup: function(group, ignoreFilter) {
            if (!this.options.multiple) {
                return;
            } // NOOP for single mode
            this._trigger('unselectGroup', null, group);
            this._updateChecks(false, ignoreFilter, group);
        }
    });
})(jQuery);