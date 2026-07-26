// import { exec } from 'child_process'
import { cloudLogin } from '@julusian/tp-link-tapo-connect'

export class PowerService {

  async testConnection() {
    try {
      const cloudApi = await cloudLogin(
        process.env.TAPO_EMAIL!,
        process.env.TAPO_PASSWORD!
      )

      console.log('Connected to Tapo.')

      const devices = await cloudApi.listDevices()

      return devices
    } catch (err) {
      console.error('Failed to connect.', err)

      return err
    }
  }

  // async shutdown() {
  //   await this.turnOutletOff()

  //   setTimeout(() => {
  //     exec('sudo shutdown -h now')
  //   }, 15000)
  // }

  // private async turnOutletOff() {

  // }
}
