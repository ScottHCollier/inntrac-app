import { zodResolver } from '@hookform/resolvers/zod';
import { SubmitHandler, useForm } from 'react-hook-form';
import * as z from 'zod';

import { UserSchedule } from '@/models';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { addDays, eachDayOfInterval, format, parseISO } from 'date-fns';
import { toast } from '@/components/ui/use-toast';
import agent from '@/api/agent';
import { Icons } from '@/components/icons';
import Select from '@/components/custom/select';
import Input from '@/components/custom/input';
import { AddScheduleTimeOff } from '../../../models/schedule';

const FormSchema = z.object({
  userId: z.string({
    required_error: 'User is required.',
  }),
  startTime: z.date({
    required_error: 'Date is required.',
  }),
  endTime: z.date({
    required_error: 'Date is required.',
  }),
});

interface Props {
  users: UserSchedule[];
  selectedUser: UserSchedule | null;
  selectedDate: Date | null;
  handleClose: () => void;
  handleChangeUser: (userId: string) => void;
}

const TimeOffForm = ({
  users,
  selectedUser,
  selectedDate,
  handleClose,
  handleChangeUser,
}: Props) => {
  const [touched, setTouched] = useState(false);

  const {
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
    reset,
    setError,
  } = useForm<z.infer<typeof FormSchema>>({
    mode: 'onTouched',
    resolver: zodResolver(FormSchema),
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleApiErrors(errors: any) {
    if (errors) {
      errors.forEach((error: string) => {
        if (error.includes('startTime')) {
          setError('startTime', { message: error });
        }
      });
    }
  }

  const onSubmit: SubmitHandler<z.infer<typeof FormSchema>> = async (data) => {
    if (selectedUser) {
      const { userId, startTime, endTime } = data;

      // Check if startDate is after endDate
      if (startTime > endTime) {
        throw new Error(
          'The start date must be before or the same as the end date.'
        );
      }

      // Get each day in the interval
      const dates = eachDayOfInterval({
        start: startTime,
        end: addDays(endTime, 1),
      });

      // Format the dates as 'yyyy-MM-dd'
      const formattedDates = dates.map((date) => date.toISOString());

      const body: AddScheduleTimeOff = {
        userId,
        status: 3,
        dates: formattedDates,
        type: 3,
        siteId: selectedUser.site.id,
        groupId: selectedUser.group.id,
      };

      await agent.Schedules.requestTimeOff(body)
        .then(() => {
          toast({
            title: 'Request Submitted',
          });
          handleClose();
        })
        .catch((error) => {
          console.log(error);
          handleApiErrors(error);
        });
    }
  };

  // async function deleteSchedule() {
  //   if (selectedSchedule) {
  //     setDeleting(true);
  //     await agent.Schedules.delete(selectedSchedule?.id)
  //       .then(() => {
  //         toast({
  //           title: 'Schedule deleted',
  //         });
  //         handleClose();
  //         setDeleting(false);
  //       })
  //       .catch((error) => {
  //         console.log(error);
  //         handleApiErrors(error);
  //         setDeleting(false);
  //       });
  //   }
  // }

  const getInitialValues = useCallback(() => {
    return {
      userId: selectedUser?.id || undefined,
      startTime: selectedDate || new Date(),
      endTime: selectedDate || new Date(),
    };
  }, [selectedDate, selectedUser]);

  useEffect(() => {
    reset(getInitialValues());
  }, [getInitialValues, reset]);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Select
        items={users.map((user) => ({
          ...user,
          name: `${user.firstName} ${user.surname}`,
        }))}
        handleChange={(userId) => {
          handleChangeUser(userId);
          setTouched(true);
        }}
        value={getInitialValues().userId}
        errors={errors}
        fieldName={'userId'}
        placeholder={'User'}
      />

      <Input
        onChange={(e) => {
          setValue('startTime', parseISO(e.target.value));
          setTouched(true);
        }}
        type='date'
        fieldName='startTime'
        defaultValue={format(getInitialValues().startTime, 'yyyy-LL-dd')}
        errors={errors}
      />

      <Input
        onChange={(e) => {
          setValue('endTime', parseISO(e.target.value));
          setTouched(true);
        }}
        type='date'
        fieldName='endTime'
        defaultValue={format(getInitialValues().endTime, 'yyyy-LL-dd')}
        errors={errors}
      />

      <div className='flex justify-end mt-6'>
        {/* {selectedSchedule && (
          <Button
            className='mr-4'
            variant='destructive'
            onClick={handleSubmit(deleteSchedule)}
          >
            {isSubmitting && deleting ? (
              <Icons.spinner className='mr-2 h-4 w-4 animate-spin' />
            ) : (
              <Icons.cross className='mr-2 h-4 w-4' />
            )}
            Delete
          </Button>
        )} */}
        <Button type='submit' disabled={isSubmitting || !touched}>
          {isSubmitting ? (
            <Icons.spinner className='mr-2 h-4 w-4 animate-spin' />
          ) : (
            <Icons.add className='mr-2 h-4 w-4' />
          )}
          {'Save'}
        </Button>
      </div>
    </form>
  );
};

export default TimeOffForm;
