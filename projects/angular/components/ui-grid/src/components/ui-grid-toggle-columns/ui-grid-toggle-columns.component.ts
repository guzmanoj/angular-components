import isEqual from 'lodash-es/isEqual';
import {
    fromEvent,
    Subject,
} from 'rxjs';
import {
    filter,
    takeUntil,
} from 'rxjs/operators';

import {
    AfterViewInit,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    ElementRef,
    EventEmitter,
    HostBinding,
    Input,
    OnDestroy,
    Output,
    ViewChild,
    ViewEncapsulation,
} from '@angular/core';
import type { MatAnchor } from '@angular/material/button';
import {
    MatSelect,
    MatSelectChange,
} from '@angular/material/select';

import {
    IGridDataEntry,
    IVisibleModel,
} from '../../models';

const COMPONENT_SELECTOR = 'ui-grid-toggle-columns';

@Component({
    selector: COMPONENT_SELECTOR,
    templateUrl: './ui-grid-toggle-columns.component.html',
    styleUrls: ['./ui-grid-toggle-columns.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiGridToggleColumnsComponent<T extends IGridDataEntry> implements AfterViewInit, OnDestroy {
    @HostBinding('class')
    hostClass = COMPONENT_SELECTOR;

    @HostBinding(`class.${COMPONENT_SELECTOR}-dirty`)
    @Input()
    dirty = false;

    @Input()
    showDivider = false;

    @Input()
    set options(options: IVisibleModel<T>[] | null) {
        if (!options || isEqual(this._options, options)) { return; }

        this._options = options;
        this._selected = options
            .filter(({ checked }) => checked)
            .map(o => o.property);
    }
    get options() {
        return this._options;
    }

    @Input()
    useLegacyDesign = false;

    @Input()
    toggleTooltip?: string;

    @Input()
    toggleTitle?: string;

    @Input()
    resetToDefaults?: string;

    @Input()
    togglePlaceholderTitle?: string;

    @Output()
    visibleColumns = new EventEmitter<IVisibleModel<T>>();

    @Output()
    resetColumns = new EventEmitter<void>();

    @Output()
    visibleColumnsToggled = new EventEmitter<boolean>();

    @ViewChild(MatSelect, { static: false })
    selectColumns?: MatSelect;

    @ViewChild('resetBtn', { static: false })
    resetBtn?: MatAnchor;

    get selected() {
        return this._selected;
    }

    private get _currentIndex() {
        if (!this.selectColumns) { return null; }
        // eslint-disable-next-line no-underscore-dangle
        return this.selectColumns._keyManager.activeItemIndex;
    }

    private set _currentIndex(i: number | null) {
        if (i == null || !this.selectColumns) { return; }
        // eslint-disable-next-line no-underscore-dangle
        this.selectColumns._keyManager.setActiveItem(i);
    }

    private get _isFirstValidIndex() {
        return !this._isResetIndex &&
            this._currentIndex === this._options.findIndex(o => !o.disabled);
    }

    private get _isResetIndex() {
        return this._currentIndex === -1;
    }

    private _selected: (string | keyof T)[] = [];
    private _options: IVisibleModel<T>[] = [];
    private _destroyed$ = new Subject<void>();

    constructor(
        private _elementRef: ElementRef<HTMLElement>,
        private _cd: ChangeDetectorRef,
    ) { }

    ngAfterViewInit() {
        fromEvent<KeyboardEvent>(
            this._elementRef.nativeElement,
            'keydown',
            { capture: true },
        ).pipe(
            filter(_ => this.dirty),
            takeUntil(this._destroyed$),
        ).subscribe(this._onKeyDown);

        this.selectColumns!.openedChange
            .pipe(
                takeUntil(this._destroyed$),
            )
            .subscribe((open) => {
                this.visibleColumnsToggled.emit(open);
            });
    }

    ngOnDestroy() {
        this._destroyed$.next();
        this._destroyed$.complete();
    }

    selectionChange({ value }: MatSelectChange) {
        this._selected = value;
        this._options
            .forEach(c => c.checked = value.includes(c.property));

        this.visibleColumns.emit(value);
    }

    reset() {
        this.resetColumns.emit();
        this.selectColumns!.close();
        this.selectColumns!.focus();
    }

    resetKeyDown(e: KeyboardEvent) {
        if (this._isArrowUp(e)) {
            e.stopImmediatePropagation();
            return;
        }

        if (this._isArrowDown(e)) {
            this.selectColumns?.focus();
        }
    }

    private _onKeyDown = (e: KeyboardEvent) => {
        if (
            this._isResetIndex &&
            this._isArrowDown(e)
        ) {
            e.preventDefault();
            e.stopImmediatePropagation();

            this.selectColumns?.focus();
            // eslint-disable-next-line no-underscore-dangle
            this.selectColumns?._keyManager.setFirstItemActive();
            this._cd.detectChanges();
        }

        if (
            this._isArrowUp(e) &&
            this._isFirstValidIndex
        ) {
            e.stopPropagation();
            this._focusOnReset();
        }
    };

    private _isArrowUp(e: KeyboardEvent) {
        return ['Up', 'ArrowUp'].includes(e.key);
    }

    private _isArrowDown(e: KeyboardEvent) {
        return ['Down', 'ArrowDown'].includes(e.key);
    }

    private _focusOnReset() {
        this._currentIndex = -1;
        this.resetBtn?.focus('keyboard');
        this._cd.detectChanges();
    }
}
