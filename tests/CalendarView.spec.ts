import { mount } from '@vue/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CalendarView from '../src/renderer/src/components/CalendarView.vue';
import MiniCalendar from '../src/renderer/src/components/MiniCalendar.vue';
import CalendarList from '../src/renderer/src/components/CalendarList.vue';
import ViewSwitcher from '../src/renderer/src/components/ViewSwitcher.vue';
import moment from 'moment';

// Mock the window.api object
const mockApi = {
  getAuthorizedUser: vi.fn(),
  getCalendarEvents: vi.fn(),
  getCalendarList: vi.fn(),
  authorizeGoogleAccount: vi.fn(),
  onReceiveMessage: vi.fn(),
};

global.window.api = mockApi;

describe('CalendarView.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.getAuthorizedUser.mockResolvedValue({ id: 'test-user' });
    mockApi.getCalendarEvents.mockResolvedValue([]);
    mockApi.getCalendarList.mockResolvedValue([
      { id: 'cal1', summary: 'Test Calendar 1' },
      { id: 'cal2', summary: 'Test Calendar 2' },
    ]);
  });

  it('renders the main calendar view when authenticated', async () => {
    const wrapper = mount(CalendarView);
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.calendar-container').exists()).toBe(true);
    expect(wrapper.find('.auth-prompt').exists()).toBe(false);
  });

  it('shows the auth prompt when not authenticated', async () => {
    mockApi.getAuthorizedUser.mockResolvedValue(null);
    const wrapper = mount(CalendarView);
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.auth-prompt').exists()).toBe(true);
    expect(wrapper.find('.calendar-container').exists()).toBe(false);
  });

  it('toggles the settings popover when the settings button is clicked', async () => {
    const wrapper = mount(CalendarView);
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();

    const settingsButton = wrapper.find('.settings-button');
    expect(wrapper.find('.popover').exists()).toBe(false);

    await settingsButton.trigger('click');
    expect(wrapper.find('.popover').exists()).toBe(true);
    expect(wrapper.findComponent(MiniCalendar).exists()).toBe(true);
    expect(wrapper.findComponent(CalendarList).exists()).toBe(true);

  await settingsButton.trigger('click');
  expect(wrapper.find('.popover').exists()).toBe(false);
});

  it('toggles the mini calendar when the calendar toggle button is clicked', async () => {
    const wrapper = mount(CalendarView);
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();

    const toggleBtn = wrapper.find('.calendar-toggle-btn');
    expect(toggleBtn.exists()).toBe(true);

    // Sidebar hidden by default
    expect(wrapper.find('.calendar-sidebar').exists()).toBe(false);

    // Show sidebar
    await toggleBtn.trigger('click');
    expect(wrapper.find('.calendar-sidebar').exists()).toBe(true);

    // Hide sidebar again
    await toggleBtn.trigger('click');
    expect(wrapper.find('.calendar-sidebar').exists()).toBe(false);
  });

  it('updates the current date when a date is selected in MiniCalendar', async () => {
    const wrapper = mount(CalendarView);
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();

    await wrapper.find('.settings-button').trigger('click');
    const miniCalendar = wrapper.findComponent(MiniCalendar);

    const newDate = moment().add(5, 'days');
    miniCalendar.vm.$emit('date-selected', newDate);
    await wrapper.vm.$nextTick();

    // Check if currentDate in CalendarView has been updated
    // Note: Direct state checking is complex, we'll check the formatted date
    expect(wrapper.find('.current-date').text()).toBe(newDate.format('MMMM YYYY'));
    // Popover should close after date selection
    expect(wrapper.find('.popover').exists()).toBe(false);
  });

  it('fetches events when visible calendars change', async () => {
    const wrapper = mount(CalendarView);
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();

    await wrapper.find('.settings-button').trigger('click');
    const calendarList = wrapper.findComponent(CalendarList);

    mockApi.getCalendarEvents.mockClear(); // Clear previous calls from onMounted
    calendarList.vm.$emit('visibility-changed', ['cal1']);
    await wrapper.vm.$nextTick();

    expect(mockApi.getCalendarEvents).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      ['cal1'],
    );
  });
});
