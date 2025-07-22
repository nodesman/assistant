import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import CalendarView from '../src/renderer/src/components/CalendarView.vue'

// Mock the window.api object
const mockApi = {
  getAuthorizedUser: vi.fn(),
  getCalendarEvents: vi.fn(),
  authorizeGoogleAccount: vi.fn(),
  onReceiveMessage: vi.fn(),
  getCalendarList: vi.fn(),
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  deleteEvent: vi.fn(),
}

global.window.api = mockApi

describe('CalendarView.vue', () => {
  it('renders the refresh button when authenticated', async () => {
    // Arrange
    mockApi.getAuthorizedUser.mockResolvedValue({ id: 'test-user' })
    mockApi.getCalendarEvents.mockResolvedValue([])
    mockApi.getCalendarList.mockResolvedValue([])
    const wrapper = mount(CalendarView)

    // Act
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()


    // Assert
    const refreshButton = wrapper.find('.refresh-button')
    expect(refreshButton.exists()).toBe(true)
  })

  it('calls fetchEvents when the refresh button is clicked', async () => {
    // Arrange
    mockApi.getAuthorizedUser.mockResolvedValue({ id: 'test-user' })
    mockApi.getCalendarEvents.mockResolvedValue([])
    mockApi.getCalendarList.mockResolvedValue([])
    const wrapper = mount(CalendarView)
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    // Act
    const refreshButton = wrapper.find('.refresh-button')
    await refreshButton.trigger('click')

    // Assert
    expect(mockApi.getCalendarEvents).toHaveBeenCalled()
  })
})
