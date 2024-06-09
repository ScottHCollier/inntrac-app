import { zodResolver } from '@hookform/resolvers/zod';
import { SubmitHandler, useForm } from 'react-hook-form';
import * as z from 'zod';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Group, Shift, UserShift } from '@/models';
import { useAppSelector } from '@/store/configure-store';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { addDays, format, parseISO } from 'date-fns';
import { toast } from '@/components/ui/use-toast';
import agent from '@/api/agent';
import { Icons } from '@/components/icons';
import Select from '@/components/custom/select';
import Input from '@/components/custom/input';
import { getTimeString } from '@/lib/utils';

const FormSchema = z.object({
  userId: z.string({
    required_error: 'User is required.',
  }),
  groupId: z.string({
    required_error: 'Group is required.',
  }),
  date: z.date({
    required_error: 'Date is required.',
  }),
  start: z.string({
    required_error: 'Start time is required.',
  }),
  end: z.string({
    required_error: 'End time is required.',
  }),
});

interface Props {
  users: UserShift[];
  groups: Group[];
  open: boolean;
  selectedUser: UserShift | null;
  selectedDate: Date | null;
  selectedShift: Shift | null;
  handleClose: () => void;
  handleChangeUser: (userId: string) => void;
}

const AddShift = ({
  users,
  groups,
  open,
  selectedUser,
  selectedDate,
  selectedShift,
  handleClose,
  handleChangeUser,
}: Props) => {
  const { user } = useAppSelector((state) => state.account);
  const [touched, setTouched] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
        if (error.includes('start')) {
          setError('start', { message: error });
        }
      });
    }
  }

  const onSubmit: SubmitHandler<z.infer<typeof FormSchema>> = async (data) => {
    const { userId, groupId, date, start, end } = data;

    const st = new Date(date);
    st.setHours(parseInt(start.split(':')[0]));
    st.setMinutes(parseInt(start.split(':')[1]));
    st.setSeconds(0);
    st.setMilliseconds(0);

    const et =
      parseInt(end.split(':')[0]) < 9
        ? addDays(new Date(date), 1)
        : new Date(date);
    et.setHours(parseInt(end.split(':')[0]));
    et.setMinutes(parseInt(end.split(':')[1]));
    et.setSeconds(0);
    et.setMilliseconds(0);

    const body = {
      siteId: user?.site.id,
      groupId,
      userId,
      pending: false,
      startTime: st,
      endTime: et,
    };

    if (selectedShift) {
      await agent.Shifts.updateShift({
        id: selectedShift.id,
        ...body,
      })
        .then(() => {
          toast({
            title: 'Shift edited',
          });
          handleClose();
        })
        .catch((error) => {
          console.log(error);
          handleApiErrors(error);
        });
    } else {
      await agent.Shifts.addShift(body)
        .then(() => {
          toast({
            title: 'Shift added',
          });
          handleClose();
        })
        .catch((error) => {
          console.log(error);
          handleApiErrors(error);
        });
    }
  };

  async function deleteShift() {
    if (selectedShift) {
      setDeleting(true);
      await agent.Shifts.delete(selectedShift?.id)
        .then(() => {
          toast({
            title: 'Shift deleted',
          });
          handleClose();
          setDeleting(false);
        })
        .catch((error) => {
          console.log(error);
          handleApiErrors(error);
          setDeleting(false);
        });
    }
  }

  const getInitialValues = useCallback(() => {
    if (selectedShift) {
      return {
        userId: selectedUser?.id || '',
        groupId: selectedShift.groupId,
        date: parseISO(selectedShift.startTime),
        start: format(parseISO(selectedShift.startTime), 'HH:mm'),
        end: format(parseISO(selectedShift.endTime), 'HH:mm'),
      };
    }
    return {
      userId: selectedUser?.id || '',
      groupId: selectedUser?.group.id || '',
      date: selectedDate || new Date(),
      start: getTimeString(new Date().getHours()),
      end: getTimeString(new Date().getHours() + 4),
    };
  }, [selectedDate, selectedShift, selectedUser]);

  useEffect(() => {
    reset(getInitialValues());
  }, [getInitialValues, reset]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>
            {selectedShift ? 'Edit Shift' : 'Add Shift'}
          </DialogTitle>
        </DialogHeader>
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
            loaded={!!selectedUser}
          />

          <Select
            items={groups}
            handleChange={(groupId) => {
              setValue('groupId', groupId);
              setTouched(true);
            }}
            value={getInitialValues().groupId}
            errors={errors}
            fieldName={'groupId'}
            placeholder={'Group'}
            loaded={!!selectedUser}
          />

          <Input
            onChange={(e) => {
              setValue('date', parseISO(e.target.value));
              setTouched(true);
            }}
            type='date'
            fieldName='date'
            defaultValue={format(getInitialValues().date, 'yyyy-LL-dd')}
            errors={errors}
          />

          <Input
            onChange={(e) => {
              setValue('start', e.target.value);
              setTouched(true);
            }}
            type='time'
            fieldName='start'
            defaultValue={getInitialValues().start}
            errors={errors}
          />

          <Input
            onChange={(e) => {
              setValue('end', e.target.value);
              setTouched(true);
            }}
            type='time'
            fieldName='end'
            defaultValue={getInitialValues().end}
            errors={errors}
          />

          <div className='flex justify-end mt-6'>
            {selectedShift && (
              <Button
                className='mr-4'
                variant='destructive'
                onClick={handleSubmit(deleteShift)}
              >
                {isSubmitting && deleting ? (
                  <Icons.spinner className='mr-2 h-4 w-4 animate-spin' />
                ) : (
                  <Icons.cross className='mr-2 h-4 w-4' />
                )}
                Delete
              </Button>
            )}
            <Button
              type='submit'
              disabled={isSubmitting || (selectedShift !== null && !touched)}
            >
              {isSubmitting && !deleting ? (
                <Icons.spinner className='mr-2 h-4 w-4 animate-spin' />
              ) : (
                <Icons.add className='mr-2 h-4 w-4' />
              )}
              {selectedShift ? 'Update' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddShift;
