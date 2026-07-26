// import { exec } from 'child_process'
import { cloudLogin, loginDevice } from '@julusian/tp-link-tapo-connect'
import { FastifyBaseLogger } from 'fastify'

type TapoCloud = Awaited<ReturnType<typeof cloudLogin>>

export class PowerService {

  constructor(
    private readonly logger: FastifyBaseLogger
  ){}

  private device: any

  private async getDevice() {

    if (this.device) {
      return this.device
    }

    const cloudApi = await cloudLogin(
      process.env.TAPO_EMAIL!,
      process.env.TAPO_PASSWORD!
    )

    const devices = await cloudApi.listDevicesByType(
      'SMART.TAPOPLUG'
    )

    const targetDevice = devices.find(
      device =>
        device.deviceId === process.env.TAPO_DEVICE_ID
    )

    if (!targetDevice) {
      throw new Error(
        'Configured Tapo device not found.'
      )
    }

    this.device = await loginDevice(
      process.env.TAPO_EMAIL!,
      process.env.TAPO_PASSWORD!,
      targetDevice
    )

    return this.device
  }


  async turnOutletOff() {

    const device = await this.getDevice()

    await device.turnOff()

    return {
      success: true,
      message: 'Outlet turned off'
    }
  }


  async turnOutletOn() {

    const device = await this.getDevice()

    await device.turnOn()

    return {
      success: true,
      message: 'Outlet turned on'
    }
  }

  // private cloudApi?: TapoCloud

  // private async getCloudApi() {
  //   if (!this.cloudApi) {
  //     this.cloudApi = await cloudLogin(
  //       process.env.TAPO_EMAIL!,
  //       process.env.TAPO_PASSWORD!
  //     )
  //   }

  //   return this.cloudApi
  // }

  // private async getDevice() {
  //   const cloudApi = await this.getCloudApi()
  //   const devices = await cloudApi.listDevices()
  //   const device = devices.find(
  //     d => d.deviceId === process.env.TAPO_DEVICE_ID
  //   )

  //   if(!device) {
  //     throw new Error('Configured Tapo device was not found.')
  //   }

  //   return device
  // }

  // async getDevices() {
  //   const api = await this.getCloudApi()

  //   return api.listDevices()
  // }

  // async testConnection() {
  //   try {
  //     const cloudApi = await cloudLogin(
  //       process.env.TAPO_EMAIL!,
  //       process.env.TAPO_PASSWORD!
  //     )

  //     console.log('Connected to Tapo.')

  //     const devices = await cloudApi.listDevices()

  //     return devices
  //   } catch (err) {
  //     console.error('Failed to connect.', err)

  //     return err
  //   }
  // }
}
