import { mlbEndpoints } from '../constants/mlbEndpoints'

export class ScheduleService {

  async getTeamSchedule(teamId: number) {
    const scheduleUrl = mlbEndpoints.teamSchedule(teamId)

    const scheduleResponse = await fetch(scheduleUrl)

    const scheduleData = await scheduleResponse.json()

    return scheduleData.dates
  }
}
